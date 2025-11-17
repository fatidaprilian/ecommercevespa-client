// file: src/accurate-sync/accurate-sync.service.ts

import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';
import { Order, User } from '@prisma/client';
import { AxiosInstance } from 'axios';

// 👇👇 UPDATE INTERFACE 👇👇
interface AccurateCustomer {
  id: number;
  name: string;
  customerNo: string;
  email?: string;
  // Kategori Pelanggan (Customer Category)
  category?: {
    id: number;
    name: string;
    parent?: any;
  };
  // Kategori Penjualan (Sales Price Category) - DITAMBAHKAN
  priceCategory?: {
    id: number;
    name: string;
  };
  priceCategoryId?: number;
}
// 👆👆 AKHIR UPDATE INTERFACE 👆👆

interface StockAdjustmentItem {
  sku: string;
  quantity: number;
}

/**
 * 👇👇 HELPER FUNCTION UPDATE - Parse customer data dari Accurate API 👇👇
 */
const parseAccurateCustomer = (rawCustomer: any): AccurateCustomer | null => {
  if (!rawCustomer) return null;
  
  return {
    id: rawCustomer.id,
    name: rawCustomer.name,
    customerNo: rawCustomer.customerNo,
    email: rawCustomer.email,
    category: rawCustomer.category,
    // 👇 Pastikan priceCategory juga diambil
    priceCategory: rawCustomer.priceCategory,
    priceCategoryId: rawCustomer.priceCategoryId || rawCustomer.priceCategory?.id,
  };
};
// 👆👆 AKHIR HELPER FUNCTION 👆👆

const formatDateToAccurate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class AccurateSyncService {
  private readonly logger = new Logger(AccurateSyncService.name);

  private customerCache = new Map<string, { customer: AccurateCustomer; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private failedSearchCache = new Map<string, number>();
  private readonly FAILED_SEARCH_TTL = 2 * 60 * 1000;

  // Simpan fields yang sering dipakai agar konsisten
  private readonly CUSTOMER_FIELDS = 'id,name,customerNo,email,category,priceCategory,priceCategoryId';

  constructor(
    private readonly prisma: PrismaService,
    private readonly accurateService: AccurateService,
    @InjectQueue('accurate-sync-queue') private readonly syncQueue: Queue,
  ) {}

  async addSalesOrderJobToQueue(orderId: string) {
    this.logger.log(
      `Adding "create-sales-order" job for Order ID: ${orderId} to the queue.`,
    );
    await this.syncQueue.add(
      'create-sales-order',
      { orderId },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );
  }

  async addStockAdjustmentJobToQueue(
    items: StockAdjustmentItem[],
    reason: string,
  ) {
    if (items.length === 0) {
      this.logger.warn(
        `Skipped adding "adjust-stock" job: No items provided. Reason: ${reason}`,
      );
      return;
    }

    this.logger.log(`Menambahkan job "adjust-stock" ke queue. Alasan: ${reason}`);
    await this.syncQueue.add(
      'adjust-stock',
      { items, reason },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
      },
    );
  }

  async addDeleteSalesOrderJobToQueue(salesOrderNumber: string) {
    this.logger.log(
      `Adding "delete-sales-order" job for SO Number: ${salesOrderNumber} to the queue.`,
    );
    await this.syncQueue.add(
      'delete-sales-order',
      { salesOrderNumber },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );
  }

  async processStockAdjustment(items: StockAdjustmentItem[], reason: string) {
    this.logger.log(
      `[WORKER] Memproses penyesuaian stok... Alasan: ${reason}`,
    );

    try {
      const apiClient = await this.accurateService.getAccurateApiClient();

      const dbInfo = await this.prisma.accurateOAuth.findFirst();
      if (!dbInfo || !dbInfo.branchName) {
        throw new InternalServerErrorException(
          'Branch name not found in Accurate configuration.',
        );
      }

      const itemSkus = items.map((item) => item.sku);
      const productsFromDb = await this.prisma.product.findMany({
        where: {
          sku: { in: itemSkus },
        },
        select: {
          sku: true,
          cost: true, 
        },
      });

      if (productsFromDb.length === 0) {
        throw new Error(
          `Tidak ada produk yang ditemukan di DB lokal untuk SKU: ${itemSkus.join(
            ', ',
          )}`,
        );
      }

      const productCostMap = new Map<string, number>();
      productsFromDb.forEach((p) => {
        if (p.cost === null || p.cost === undefined) {
          this.logger.warn(
            `[WORKER] Cost untuk SKU ${p.sku} adalah null/undefined. Menggunakan 0.`,
          );
          productCostMap.set(p.sku, 0);
        } else {
          productCostMap.set(p.sku, p.cost);
        }
      });

      const adjustmentDetails = items
        .map((item) => {
          const unitCost = productCostMap.get(item.sku);

          if (unitCost === undefined) {
            this.logger.warn(
              `[WORKER] SKU: ${item.sku} tidak ditemukan di DB lokal saat mapping. Item ini akan dilewati.`,
            );
            return null;
          }

          return {
            itemNo: item.sku,
            quantity: item.quantity,
            itemAdjustmentType: 'ADJUSTMENT_IN',
            unitCost: unitCost,
          };
        })
        .filter(Boolean);

      if (adjustmentDetails.length === 0) {
        this.logger.error(
          `[WORKER] Penyesuaian stok gagal: Tidak ada item valid (SKU & Cost) untuk dikirim ke Accurate.`,
        );
        throw new Error(
          'Tidak ada item valid untuk penyesuaian stok di Accurate.',
        );
      }

      const payload = {
        transDate: formatDateToAccurate(new Date()),
        description: `Otomatis: Pembatalan pesanan. (${reason})`,
        branchName: dbInfo.branchName,
        detailItem: adjustmentDetails,
      };

      this.logger.debug(
        `[WORKER] Mengirim payload ke /api/item-adjustment/save.do: ${JSON.stringify(
          payload,
        )}`,
      );

      const response = await apiClient.post(
        '/accurate/api/item-adjustment/save.do',
        payload,
      );

      if (!response.data?.s) {
        const errorMessage =
          response.data?.d?.[0] ||
          'Gagal menyimpan penyesuaian item di Accurate.';
        this.logger.error(
          `Error Accurate API Response: ${JSON.stringify(response.data)}`,
        );
        throw new Error(errorMessage);
      }

      const adjustmentNumber = response.data.r?.number;
      this.logger.log(
        `✅✅✅ [WORKER SUKSES] Penyesuaian stok berhasil dibuat di Accurate. No: ${adjustmentNumber}`,
      );
      return response.data.r;
    } catch (error) {
      const errorMessage = error.response?.data?.d?.[0] || error.message;
      this.logger.error(
        `[WORKER FATAL] Gagal memproses penyesuaian stok. Error: ${errorMessage}`,
        error.stack,
      );
      throw new Error(
        `Gagal memproses penyesuaian stok di Accurate: ${errorMessage}`,
      );
    }
  }

  async processDeleteSalesOrder(salesOrderNumber: string) {
    this.logger.log(
      `[WORKER] Memproses PENGHAPUSAN untuk Sales Order: ${salesOrderNumber}`,
    );
    try {
      const apiClient = await this.accurateService.getAccurateApiClient();
      const payload = {
        number: salesOrderNumber,
      };

      this.logger.debug(
        `[WORKER] Mengirim payload ke /api/sales-order/delete.do: ${JSON.stringify(
          payload,
        )}`,
      );

      const response = await apiClient.post(
        '/accurate/api/sales-order/delete.do',
        payload,
      );

      if (!response.data?.s) {
        const errorMessage =
          response.data?.d?.[0] || 'Gagal menghapus Sales Order di Accurate.';
        this.logger.error(
          `Error Accurate API Response (SO Delete): ${JSON.stringify(
            response.data,
          )}`,
        );
        throw new Error(errorMessage);
      }

      this.logger.log(
        `✅✅✅ [WORKER SUKSES] Sales Order ${salesOrderNumber} berhasil dihapus dari Accurate.`,
      );
      return response.data.r;
    } catch (error) {
      const errorMessage = error.response?.data?.d?.[0] || error.message;
      this.logger.error(
        `[FATAL WORKER] Penghapusan untuk SO: ${salesOrderNumber} gagal. Alasan: ${errorMessage}`,
        error.stack,
      );
      throw new Error(`Gagal menghapus SO di Accurate: ${errorMessage}`);
    }
  }

  async processSalesOrderCreation(orderId: string) {
    this.logger.log(
      `WORKER: Processing Sales Order creation for Order ID: ${orderId}`,
    );
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: { include: { product: true } } },
    });
    if (!order) {
      throw new Error(
        `Order with ID ${orderId} not found during job processing.`,
      );
    }
    if (order.user.role !== 'RESELLER') {
      this.logger.log(
        `SKIPPED: Sales Order creation for Order ID: ${orderId} - User ${order.user.email} is not a RESELLER (role: ${order.user.role})`,
      );
      return { skipped: true, reason: 'User is not a reseller' };
    }
    try {
      const dbInfo = await this.prisma.accurateOAuth.findFirst();
      if (!dbInfo || !dbInfo.branchName) {
        throw new InternalServerErrorException(
          'Branch name not found in Accurate configuration.',
        );
      }
      const accurateCustomer = await this.findOrCreateCustomer(order.user);
      if (!accurateCustomer || !accurateCustomer.customerNo) {
        throw new InternalServerErrorException(
          `Failed to get or create a valid customer in Accurate for user ID: ${order.user.id}`,
        );
      }
      const apiClient = await this.accurateService.getAccurateApiClient();
      const detailItem = order.items.map((item) => ({
        itemNo: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
      }));
      if (order.shippingCost > 0) {
        detailItem.push({
          itemNo: 'SHIPPING',
          quantity: 1,
          unitPrice: order.shippingCost,
        });
      }
      const salesOrderPayload = {
        customerNo: accurateCustomer.customerNo,
        transDate: formatDateToAccurate(new Date(order.createdAt)),
        detailItem: detailItem,
        branchName: dbInfo.branchName,
        number: `SO-${order.orderNumber}`,
      };
      const response = await apiClient.post(
        '/accurate/api/sales-order/save.do',
        salesOrderPayload,
      );
      if (!response.data?.s) {
        const errorMessage =
          response.data?.d?.[0] || 'Failed to create Sales Order in Accurate.';
        this.logger.error(
          `Error Accurate API Response (SO): ${JSON.stringify(response.data)}`,
        );
        throw new Error(errorMessage);
      }
      const salesOrderNumber = response.data.r.number as string;
      await this.prisma.order.update({
        where: { id: orderId },
        data: { accurateSalesOrderNumber: salesOrderNumber },
      });
      this.logger.log(
        `✅✅✅ WORKER SUCCESS: Sales Order ${salesOrderNumber} created in Accurate for order ${order.orderNumber}. Status remains PENDING until invoice is created.`,
      );
      return response.data.r;
    } catch (error) {
      const errorMessage = error.response?.data?.d?.[0] || error.message;
      this.logger.error(
        `[FATAL WORKER] Sales Order creation for Order ID: ${orderId} failed. Reason: ${errorMessage}`,
        error.stack,
      );
      throw new Error(`Failed to process sale in Accurate: ${errorMessage}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleWebhookRenewal() {
    this.logger.log('CRON JOB: Triggering Accurate webhook renewal.');
    await this.accurateService.renewWebhook();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleProductSync() {
    const waitingJobs = await this.syncQueue.getJobs(['wait', 'delayed']);
    const activeJobs = await this.syncQueue.getActive();
    const existingSyncJob = [...waitingJobs, ...activeJobs].find(
      (job) => job.name === 'sync-products',
    );

    if (!existingSyncJob) {
      this.logger.log('CRON JOB: Adding "sync-products" job to the queue.');
      await this.syncQueue.add(
        'sync-products',
        {},
        { removeOnComplete: true, removeOnFail: 10 },
      );
    } else {
      this.logger.log(
        'CRON JOB: Skipping "sync-products" job addition, already exists in queue.',
      );
    }
  }

  async syncProductsFromAccurate() {
    this.logger.log('WORKER: Starting product synchronization from Accurate...');
    try {
      const apiClient = await this.accurateService.getAccurateApiClient();
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      let totalSyncedCount = 0;

      while (hasMore) {
        this.logger.log(`WORKER: Fetching product page ${page}...`);
        const response = await apiClient.get('/accurate/api/item/list.do', {
          params: {
            fields: 'id,no,name,itemType,unitPrice,quantity,averageCost',
            'sp.page': page,
            'sp.pageSize': pageSize,
            'filter.suspended.op': 'EQUAL',
            'filter.suspended.val': false
          },
        });

        this.logger.log(`WORKER: API Response 'm' object: ${JSON.stringify(response.data.m)}`);
        this.logger.log(`WORKER: API Response returned ${response.data.d?.length || 0} items on page ${page}.`);

        const itemsFromAccurate = response.data.d;
        if (!itemsFromAccurate || itemsFromAccurate.length === 0) {
          this.logger.warn(
            `WORKER: No items found on page ${page}. Ending sync.`,
          );
          hasMore = false;
          break;
        }

        let pageSyncedCount = 0;
        for (const item of itemsFromAccurate) {
          if (item.itemType !== 'INVENTORY') continue;
          
          try {
            const stockFromAccurate = item.quantity || 0;
            
            const existingProduct = await this.prisma.product.findUnique({
              where: { sku: item.no },
              include: {
                orderItems: {
                  where: {
                    order: {
                      status: {
                        in: ['PENDING', 'PAID', 'PROCESSING']
                      }
                    }
                  },
                  select: {
                    quantity: true,
                    order: {
                      select: {
                        orderNumber: true,
                        status: true
                      }
                    }
                  }
                }
              }
            });

            const reservedStock = existingProduct?.orderItems.reduce(
              (sum, item) => sum + item.quantity, 
              0
            ) || 0;

            const finalStock = Math.max(0, stockFromAccurate - reservedStock);

            if (reservedStock > 0) {
              this.logger.log(
                `[CronSync] SKU ${item.no}: ` +
                `Accurate=${stockFromAccurate}, ` +
                `Reserved=${reservedStock}, ` +
                `Final=${finalStock}`
              );
            }

            const savedProduct = await this.prisma.product.upsert({
              where: { sku: item.no },
              update: {
                // name: item.name,
                price: item.unitPrice || 0,
                stock: finalStock,
                cost: item.averageCost || 0,
                accurateItemId: item.id.toString(),
              },
              create: {
                sku: item.no,
                name: item.name,
                price: item.unitPrice || 0,
                stock: finalStock,
                cost: item.averageCost || 0,
                weight: 1000,
                accurateItemId: item.id.toString(),
              },
            });
            
            pageSyncedCount++;
          } catch (upsertError) {
            this.logger.error(
              `WORKER: Failed to upsert product with SKU ${item.no}. Error: ${upsertError.message}`,
              upsertError.stack,
            );
          }
        }
        
        this.logger.log(
          `WORKER: Synced ${pageSyncedCount} products from page ${page}.`,
        );
        totalSyncedCount += pageSyncedCount;

        hasMore = itemsFromAccurate.length === pageSize;
        
        page++;

        if (hasMore) {
          await delay(500);
        }
      }

      this.logger.log(
        `WORKER: Successfully synced ${totalSyncedCount} products of type INVENTORY.`,
      );
      return {
        syncedCount: totalSyncedCount,
        message: `Berhasil menyinkronkan ${totalSyncedCount} produk.`,
      };
    } catch (error) {
      const errorMessage = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      this.logger.error(
        `WORKER: Failed to sync products from Accurate. Error: ${errorMessage}`,
        error.stack,
      );
      throw new Error('Gagal menyinkronkan produk dari Accurate.');
    }
  }

  async createSalesInvoiceAndReceipt(
    orderId: string,
    accurateBankNo: string,
    accurateBankName: string,
  ) {
    this.logger.log(
      `Starting sales process for Order ID: ${orderId} -> Bank: ${accurateBankName} (Account No: ${accurateBankNo})`,
    );
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        user: true,
        payment: true,
      },
    });
    if (!order || !order.payment) {
      throw new Error(`Order or payment data for ID ${orderId} not found.`);
    }
    try {
      const dbInfo = await this.prisma.accurateOAuth.findFirst();
      if (!dbInfo || !dbInfo.branchName) {
        throw new InternalServerErrorException(
          'Branch name not found in Accurate configuration.',
        );
      }
      const accurateCustomer = await this.findOrCreateCustomer(order.user);
      if (!accurateCustomer || !accurateCustomer.customerNo) {
        throw new InternalServerErrorException(
          `Failed to retrieve a valid customer object from Accurate for user ID: ${order.user.id}`,
        );
      }
      const apiClient = await this.accurateService.getAccurateApiClient();
      const detailItem = order.items.map((item) => ({
        itemNo: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
      }));
      if (order.shippingCost > 0) {
        detailItem.push({
          itemNo: 'SHIPPING',
          quantity: 1,
          unitPrice: order.shippingCost,
        });
      }
      const invoicePayload = {
        customerNo: accurateCustomer.customerNo,
        transDate: formatDateToAccurate(new Date(order.createdAt)),
        detailItem: detailItem,
        branchName: dbInfo.branchName,
        number: `INV-${order.orderNumber}`,
      };
      const invoiceResponse = await apiClient.post(
        '/accurate/api/sales-invoice/save.do',
        invoicePayload,
      );
      if (!invoiceResponse.data?.s || !invoiceResponse.data?.r?.id) {
        this.logger.error(
          `Error Accurate API Response (SI): ${JSON.stringify(
            invoiceResponse.data,
          )}`,
        );
        throw new Error(
          invoiceResponse.data?.d?.[0] ||
            'Failed to create Sales Invoice in Accurate.',
        );
      }
      const invoiceId = invoiceResponse.data.r.id as number;
      const invoiceNumber = invoiceResponse.data.r.number as string;
      const accurateTotalAmount = invoiceResponse.data.r.totalAmount as number;
      this.logger.log(
        `Successfully created Sales Invoice: ${invoiceNumber} (ID: ${invoiceId}) with Accurate Total: Rp ${accurateTotalAmount}`,
      );
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          accurateSalesInvoiceId: invoiceId,
          accurateSalesInvoiceNumber: invoiceNumber,
        },
      });
      await delay(2000);
      const receiptPayload = {
        bankNo: accurateBankNo,
        transDate: formatDateToAccurate(
          new Date(order.payment.updatedAt || order.payment.createdAt),
        ),
        customerNo: accurateCustomer.customerNo,
        branchName: dbInfo.branchName,
        chequeAmount: accurateTotalAmount,
        detailInvoice: [
          {
            invoiceNo: invoiceNumber,
            paymentAmount: accurateTotalAmount,
          },
        ],
        number: `SR-${order.orderNumber}`,
      };
      this.logger.log(
        `Creating Sales Receipt for Rp ${accurateTotalAmount} for Invoice ${invoiceNumber}`,
      );
      const receiptResponse = await apiClient.post(
        '/accurate/api/sales-receipt/save.do',
        receiptPayload,
      );
      if (!receiptResponse.data?.s) {
        this.logger.error(
          `Error Accurate API Response (SR): ${JSON.stringify(
            receiptResponse.data,
          )}`,
        );
        throw new Error(
          receiptResponse.data?.d?.[0] ||
            'Failed while saving Sales Receipt.',
        );
      }
      const receiptId = receiptResponse.data.r.id as number;
      const receiptNumber = receiptResponse.data.r.number as string;

      await this.prisma.order.update({
        where: { id: orderId },
        data: { accurateSalesReceiptId: receiptId },
      });

      this.logger.log(
        `✅✅✅ SUCCESS: Sales Receipt ${receiptNumber} created.`,
      );
      return receiptResponse.data.r;
    } catch (error) {
      const errorMessage = error.response?.data?.d?.[0] || error.message;
      this.logger.error(
        `[FATAL] Process for Order ID: ${orderId} stopped. Reason: ${errorMessage}`,
        error.stack,
      );
      throw new Error(`Failed to process sale in Accurate: ${errorMessage}`);
    }
  }

  private async findCustomerByNo(
    apiClient: AxiosInstance,
    customerNo: string,
  ): Promise<AccurateCustomer | null> {
    const failedSearch = this.failedSearchCache.get(customerNo);
    if (failedSearch && Date.now() - failedSearch < this.FAILED_SEARCH_TTL) {
      this.logger.debug(
        `[Cache Skip] Pencarian ${customerNo} dilewati karena baru saja gagal.`,
      );
      return null;
    }

    // Strategy 1: Direct ID lookup
    try {
      const directResponse = await apiClient.get(
        `/accurate/api/customer/detail.do`,
        {
          params: { customerNo: customerNo },
        },
      );
      if (directResponse.data?.s && directResponse.data?.r) {
        this.logger.log(
          `[Pencarian Langsung] Pelanggan ${customerNo} ditemukan.`,
        );
        return parseAccurateCustomer(directResponse.data.r);
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian Langsung] Tidak berhasil untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 2: Enhanced filter search
    try {
      const searchResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
            // 👇👇 UPDATE FIELDS 👇👇
            fields: this.CUSTOMER_FIELDS,
            'filter.customerNo.op': 'EQUAL',
            'filter.customerNo.val[0]': customerNo,
            'sp.pageSize': 1,
          },
        },
      );

      if (searchResponse.data?.s && searchResponse.data?.d?.length > 0) {
        const customer = searchResponse.data.d[0];
        if (customer.customerNo === customerNo) {
          this.logger.log(
            `[Pencarian Filter EQUAL] Pelanggan ${customerNo} ditemukan.`,
          );
          return parseAccurateCustomer(customer);
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian Filter EQUAL] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 3: CONTAINS
    try {
      const containsSearchResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
             // 👇👇 UPDATE FIELDS 👇👇
            fields: this.CUSTOMER_FIELDS,
            'filter.customerNo.op': 'CONTAINS',
            'filter.customerNo.val[0]': customerNo,
            'sp.pageSize': 10,
          },
        },
      );

      if (
        containsSearchResponse.data?.s &&
        containsSearchResponse.data?.d?.length > 0
      ) {
        const exactMatch = containsSearchResponse.data.d.find(
          (c: any) => c.customerNo === customerNo,
        );
        if (exactMatch) {
          this.logger.log(
            `[Pencarian CONTAINS] Pelanggan ${customerNo} ditemukan.`,
          );
          return parseAccurateCustomer(exactMatch);
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian CONTAINS] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 4: LIKE
    try {
      const likeSearchResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
             // 👇👇 UPDATE FIELDS 👇👇
            fields: this.CUSTOMER_FIELDS,
            'filter.customerNo.op': 'LIKE',
            'filter.customerNo.val[0]': `%${customerNo}%`,
            'sp.pageSize': 20,
          },
        },
      );

      if (
        likeSearchResponse.data?.s &&
        likeSearchResponse.data?.d?.length > 0
      ) {
        const exactMatch = likeSearchResponse.data.d.find(
          (c: any) => c.customerNo === customerNo,
        );
        if (exactMatch) {
          this.logger.log(`[Pencarian LIKE] Pelanggan ${customerNo} ditemukan.`);
          return parseAccurateCustomer(exactMatch);
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian LIKE] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 5: STARTS_WITH, ENDS_WITH
    const filterOperators = ['STARTS_WITH', 'ENDS_WITH'];

    for (const operator of filterOperators) {
      try {
        let filterValue = customerNo;
        if (operator === 'STARTS_WITH') {
          filterValue = customerNo.split('-')[0];
        } else if (operator === 'ENDS_WITH') {
          const parts = customerNo.split('-');
          if (parts.length > 1) {
            filterValue = parts[parts.length - 1];
          }
        }

        const operatorSearchResponse = await apiClient.get(
          '/accurate/api/customer/list.do',
          {
            params: {
               // 👇👇 UPDATE FIELDS 👇👇
              fields: this.CUSTOMER_FIELDS,
              [`filter.customerNo.op`]: operator,
              [`filter.customerNo.val[0]`]: filterValue,
              'sp.pageSize': 50,
            },
          },
        );

        if (
          operatorSearchResponse.data?.s &&
          operatorSearchResponse.data?.d?.length > 0
        ) {
          const exactMatch = operatorSearchResponse.data.d.find(
            (c: any) => c.customerNo === customerNo,
          );
          if (exactMatch) {
            this.logger.log(
              `[Pencarian ${operator}] Pelanggan ${customerNo} ditemukan.`,
            );
            return parseAccurateCustomer(exactMatch);
          }
        }
      } catch (e) {
        this.logger.debug(
          `[Pencarian ${operator}] Gagal untuk ${customerNo}: ${e.message}`,
        );
      }
    }

    // Strategy 6: No filter
    try {
      this.logger.log(
        `[Pencarian Tanpa Filter] Mencoba pencarian tanpa filter untuk ${customerNo}...`,
      );

      const sortOrder = customerNo.startsWith('ECOMM-') ? 'DESC' : 'ASC';
      const smallPageResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
             // 👇👇 UPDATE FIELDS 👇👇
            fields: this.CUSTOMER_FIELDS,
            'sp.page': 1,
            'sp.pageSize': 100,
            'sort.customerNo': sortOrder,
          },
        },
      );

      if (
        smallPageResponse.data?.s &&
        smallPageResponse.data?.d?.length > 0
      ) {
        const exactMatch = smallPageResponse.data.d.find(
          (c: any) => c.customerNo === customerNo,
        );
        if (exactMatch) {
          this.logger.log(
            `[Pencarian Tanpa Filter] Pelanggan ${customerNo} ditemukan di halaman 1.`,
          );
          return parseAccurateCustomer(exactMatch);
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian Tanpa Filter] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 7: Pagination
    try {
      this.logger.log(
        `[Pencarian Pagination] Memulai pencarian paginated untuk ${customerNo}...`,
      );

      let page = 1;
      let hasMore = true;
      let totalSearched = 0;
      const maxRecordsToSearch = 5000;
      const pageSize = 200;

      const sortOrder = customerNo.startsWith('ECOMM-') ? 'DESC' : 'ASC';

      while (hasMore && totalSearched < maxRecordsToSearch) {
        try {
          const listResponse = await apiClient.get(
            '/accurate/api/customer/list.do',
            {
              params: {
                 // 👇👇 UPDATE FIELDS 👇👇
                fields: this.CUSTOMER_FIELDS,
                'sp.page': page,
                'sp.pageSize': pageSize,
                'sort.customerNo': sortOrder,
              },
            },
          );

          if (listResponse.data?.s && listResponse.data?.d?.length > 0) {
            const customers = listResponse.data.d;
            totalSearched += customers.length;

            const exactMatch = customers.find(
              (c: any) => c.customerNo === customerNo,
            );
            if (exactMatch) {
              this.logger.log(
                `[Pencarian Pagination] Pelanggan ${customerNo} ditemukan di halaman ${page} (total searched: ${totalSearched}).`,
              );
              return parseAccurateCustomer(exactMatch);
            }

            if (customerNo.startsWith('ECOMM-') && sortOrder === 'DESC') {
              const hasNonEcommCustomers = customers.some(
                (c) => !c.customerNo?.startsWith('ECOMM-'),
              );
              if (hasNonEcommCustomers) {
                this.logger.log(
                  `[Pencarian Pagination] Optimization: Reached non-ECOMM customers, stopping search for ${customerNo}.`,
                );
                break;
              }
            }

            hasMore = listResponse.data.m?.next;
            page++;

            if (page % 10 === 0) {
              await delay(500);
              this.logger.log(
                `[Pencarian Pagination] Searched ${totalSearched} records so far...`,
              );
            }
          } else {
            hasMore = false;
          }
        } catch (pageError) {
          this.logger.error(
            `[Pencarian Pagination] Error di halaman ${page}: ${pageError.message}`,
          );
          hasMore = false;
        }
      }

      if (totalSearched >= maxRecordsToSearch) {
        this.logger.warn(
          `[Pencarian Pagination] Pencarian dihentikan setelah ${maxRecordsToSearch} records untuk efisiensi.`,
        );
      }
    } catch (e) {
      this.logger.error(
        `[Pencarian Pagination] Gagal mencari ${customerNo}: ${e.message}`,
      );
    }

    this.failedSearchCache.set(customerNo, Date.now());
    this.logger.warn(
      `[Semua Strategi] Pelanggan ${customerNo} tidak ditemukan dengan semua metode pencarian.`,
    );
    return null;
  }

  private async findCustomerByNoWithCache(
    apiClient: AxiosInstance,
    customerNo: string,
  ): Promise<AccurateCustomer | null> {
    const cached = this.customerCache.get(customerNo);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`[Cache Hit] Pelanggan ${customerNo} ditemukan di cache.`);
      return cached.customer;
    }

    const customer = await this.findCustomerByNo(apiClient, customerNo);

    if (customer) {
      this.customerCache.set(customerNo, { customer, timestamp: Date.now() });
      this.failedSearchCache.delete(customerNo);
    }

    return customer;
  }

  public clearCaches() {
    this.customerCache.clear();
    this.failedSearchCache.clear();
    this.logger.log('Customer search caches cleared.');
  }

  public getCacheStats() {
    return {
      customerCacheSize: this.customerCache.size,
      failedSearchCacheSize: this.failedSearchCache.size,
      customerCacheHits: Array.from(this.customerCache.values()).filter(
        (c) => Date.now() - c.timestamp < this.CACHE_TTL,
      ).length,
      failedSearchCacheHits: Array.from(this.failedSearchCache.entries()).filter(
        ([_, timestamp]) => Date.now() - timestamp < this.FAILED_SEARCH_TTL,
      ).length,
    };
  }

  public clearCustomerCache(customerNo: string): void {
    this.customerCache.delete(customerNo);
    this.failedSearchCache.delete(customerNo);
    this.logger.log(`Customer cache cleared for ${customerNo}`);
  }

  private async findOrCreateCustomer(user: User): Promise<AccurateCustomer> {
    const apiClient = await this.accurateService.getAccurateApiClient();
    let customerToSearch: string | null = null;
    let isManualId = false;

    if (
      user.accurateCustomerNo &&
      !user.accurateCustomerNo.startsWith('ECOMM-')
    ) {
      this.logger.log(
        `[Jalur Prioritas] Menggunakan ID manual: ${user.accurateCustomerNo}`,
      );
      customerToSearch = user.accurateCustomerNo;
      isManualId = true;
    } else {
      customerToSearch = `ECOMM-${user.id}`;
      this.logger.log(
        `[Jalur Otomatis] Menggunakan ID sistem: ${customerToSearch}`,
      );
    }

    let foundCustomer = await this.findCustomerByNoWithCache(
      apiClient,
      customerToSearch,
    );

    if (!foundCustomer && isManualId) {
      this.logger.warn(
        `[Jalur Prioritas] ID manual ${customerToSearch} tidak ditemukan. Mencoba fallback ke ID sistem.`,
      );
      customerToSearch = `ECOMM-${user.id}`;
      foundCustomer = await this.findCustomerByNoWithCache(
        apiClient,
        customerToSearch,
      );
    }

    if (foundCustomer) {
      this.logger.log(
        `Pelanggan ditemukan: ${foundCustomer.customerNo}. Memastikan data lokal sinkron.`,
      );
      if (user.accurateCustomerNo !== foundCustomer.customerNo) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { accurateCustomerNo: foundCustomer.customerNo },
        });
      }
      return foundCustomer;
    }

    const customerIdToCreate = `ECOMM-${user.id}`;
    this.logger.log(
      `[Jalur Kreasi] Pelanggan tidak ditemukan. Membuat pelanggan baru dengan ID: ${customerIdToCreate}`,
    );

    try {
      const createPayload = {
        name: user.name || user.email,
        customerNo: customerIdToCreate,
        email: user.email,
      };
      const createResponse = await apiClient.post(
        '/accurate/api/customer/save.do',
        createPayload,
      );

        if (createResponse.data?.s) {
          const newAccurateCustomer = parseAccurateCustomer(createResponse.data.r);
          
          if (!newAccurateCustomer) {
            throw new Error('Failed to parse customer data from Accurate response');
          }
          
          this.logger.log(
            `[Jalur Kreasi] Pelanggan baru berhasil dibuat: ${newAccurateCustomer.customerNo}`,
          );

          this.customerCache.set(newAccurateCustomer.customerNo, {
            customer: newAccurateCustomer,
            timestamp: Date.now(),
          });

          this.failedSearchCache.delete(customerIdToCreate);

          await this.prisma.user.update({
            where: { id: user.id },
            data: { accurateCustomerNo: newAccurateCustomer.customerNo },
          });
          return newAccurateCustomer;
        } else {
        const errorMessage =
          createResponse.data?.d?.[0] || 'Gagal membuat pelanggan di Accurate.';
        if (errorMessage.includes('Sudah ada data lain dengan ID Pelanggan')) {
          this.logger.warn(
            `[Jalur Kreasi] Gagal membuat karena duplikat. Mencoba mencari ulang...`,
          );
          await delay(2000);
          this.customerCache.delete(customerIdToCreate);
          this.failedSearchCache.delete(customerIdToCreate);
          const customer = await this.findCustomerByNoWithCache(
            apiClient,
            customerIdToCreate,
          );
          if (customer) {
            this.logger.log(
              `[Jalur Kreasi] Pelanggan ditemukan setelah gagal membuat.`,
            );
            return customer;
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.d?.[0] || error.message;
      if (errorMessage.includes('Sudah ada data lain dengan ID Pelanggan')) {
        this.logger.warn(
          `[Jalur Kreasi - Catch] Gagal membuat karena duplikat. Mencoba mencari ulang...`,
        );
        await delay(2000);
        this.customerCache.delete(customerIdToCreate);
        this.failedSearchCache.delete(customerIdToCreate);
        const customer = await this.findCustomerByNoWithCache(
          apiClient,
          customerIdToCreate,
        );
        if (customer) {
          this.logger.log(
            `[Jalur Kreasi - Catch] Pelanggan ditemukan setelah gagal membuat.`,
          );
          return customer;
        }
      }
      this.logger.error(
        `[Jalur Kreasi] Gagal membuat pelanggan di Accurate: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        `Gagal membuat pelanggan di Accurate: ${errorMessage}`,
      );
    }
  }

  public async searchCustomer(customerNo: string): Promise<AccurateCustomer | null> {
    const apiClient = await this.accurateService.getAccurateApiClient();
    return this.findCustomerByNoWithCache(apiClient, customerNo);
  }

  // 👇👇👇 TAMBAHAN METHOD BARU - syncPriceAdjustmentRules 👇👇👇
@Cron(CronExpression.EVERY_HOUR)
async syncPriceAdjustmentRules() {
  this.logger.log('WORKER: Memulai sinkronisasi Aturan Harga (Tiers & Rules)...');
  // 1. Catat waktu mulai untuk penanda cleaning nanti
  const syncStartTime = new Date();

  try {
    const apiClient = await this.accurateService.getAccurateApiClient();

    // 2. Ambil Daftar ID Dokumen Aktif
    const listResponse = await apiClient.get(
      '/accurate/api/sellingprice-adjustment/list.do',
      {
        params: {
          fields: 'id,number',
          'filter.suspended.op': 'EQUAL',
          'filter.suspended.val': false,
        },
      },
    );

    if (!listResponse.data?.s) {
      throw new Error('Gagal mengambil daftar sellingprice-adjustment.');
    }

    // ======================= PERUBAHAN DI SINI =======================
    // Sortir terlebih dahulu berdasarkan nomor dokumen.
    // Tujuan: dokumen dengan nomor paling besar diproses TERAKHIR,
    // sehingga harga/set terbaru yang menang (override yang lama).
    const documentList = (listResponse.data.d || []).sort((a, b) =>
      (a.number || '').localeCompare(b.number || ''),
    );
    // ===================== AKHIR PERUBAHAN =========================

    this.logger.log(`Ditemukan ${documentList.length} dokumen penyesuaian aktif.`);

    let tiersSynced = 0;
    let rulesSynced = 0;

    // 3. Loop Dokumen & Update Data (Sekarang sudah terurut)
    for (const doc of documentList) {
      // Delay sedikit agar tidak memberondong server Accurate
      await new Promise((resolve) => setTimeout(resolve, 300));

      const detailResponse = await apiClient.get(
        '/accurate/api/sellingprice-adjustment/detail.do',
        { params: { id: doc.id } },
      );

      if (!detailResponse.data?.s || !detailResponse.data?.d) continue;
      const adj = detailResponse.data.d;

      // Pastikan ada target kategori pelanggan
      if (!adj.priceCategory?.id) continue;
      const customerCategoryId = adj.priceCategory.id;

      // Tanggal efektif
      const startDate = adj.transDate
        ? new Date(adj.transDate.split('/').reverse().join('-'))
        : new Date();

      if (!adj.detailItem) continue;

      for (const detail of adj.detailItem) {
        const accurateItemId = detail.item?.id?.toString();
        if (!accurateItemId) continue;

        // Cari ID produk lokal berdasarkan accurateItemId
        const localProduct = await this.prisma.product.findUnique({
          where: { accurateItemId },
          select: { id: true },
        });
        if (!localProduct) continue;

        // === KASUS A: Harga Tetap (Tier) ===
        // (Sudah pakai >= 0 dan simpan nama promo + lastSyncedAt)
        if (adj.salesAdjustmentType === 'ITEM_PRICE_TYPE' && detail.price >= 0) {
          await this.prisma.productPriceTier.upsert({
            where: {
              productId_accuratePriceCategoryId: {
                productId: localProduct.id,
                accuratePriceCategoryId: customerCategoryId,
              },
            },
            update: {
              price: detail.price,
              name: `Promo ${adj.number}`, // Simpan nomor SPA sebagai nama promo
              lastSyncedAt: new Date(),    // Tandai waktu sync
            },
            create: {
              productId: localProduct.id,
              accuratePriceCategoryId: customerCategoryId,
              price: detail.price,
              name: `Promo ${adj.number}`,
              lastSyncedAt: new Date(),
            },
          });
          tiersSynced++;
        }

        // === KASUS B: Diskon Persen (Rule) ===
        else if (
          detail.itemDiscPercent !== null &&
          detail.itemDiscPercent !== undefined &&
          parseFloat(detail.itemDiscPercent) >= 0
        ) {
          const uniqueRuleId = `RULE-${adj.id}-${accurateItemId}`;

          await this.prisma.priceAdjustmentRule.upsert({
            where: { accurateRuleId: uniqueRuleId },
            update: {
              name: `Promo ${adj.number} (${adj.priceCategory.name})`,
              accuratePriceCategoryId: customerCategoryId,
              productId: localProduct.id,
              accurateItemId,
              discountType: 'PERCENTAGE',
              discountValue: parseFloat(detail.itemDiscPercent),
              startDate,
              isActive: !adj.suspended,
              lastSyncedAt: new Date(), // supaya nggak ikut kehapus saat cleaning
              priority: 1,
            },
            create: {
              accurateRuleId: uniqueRuleId,
              name: `Promo ${adj.number} (${adj.priceCategory.name})`,
              accuratePriceCategoryId: customerCategoryId,
              productId: localProduct.id,
              accurateItemId,
              discountType: 'PERCENTAGE',
              discountValue: parseFloat(detail.itemDiscPercent),
              startDate,
              isActive: !adj.suspended,
              lastSyncedAt: new Date(),
              priority: 1,
            },
          });
          rulesSynced++;
        }
      }
    }

    // 4. AUTO-CLEANING RULES
    // Hapus rules yang waktu sync-nya lebih lama dari waktu mulai job ini
    const deletedRules = await this.prisma.priceAdjustmentRule.deleteMany({
      where: {
        lastSyncedAt: {
          lt: syncStartTime,
        },
      },
    });

    this.logger.log(
      `✅ SYNC SELESAI: ${tiersSynced} Tiers diupdate, ${rulesSynced} Rules diupdate.`,
    );
    if (deletedRules.count > 0) {
      this.logger.log(`🧹 CLEANING: ${deletedRules.count} rules usang berhasil dihapus.`);
    }

    return { tiers: tiersSynced, rules: rulesSynced, cleanedRules: deletedRules.count };
  } catch (error: any) {
    this.logger.error(`Gagal sinkronisasi pricing: ${error.message}`, error.stack);
    return { error: error.message };
  }
}


}