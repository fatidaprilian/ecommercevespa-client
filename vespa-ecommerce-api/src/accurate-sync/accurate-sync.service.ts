// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.service.ts

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

interface AccurateCustomer {
  id: number;
  name: string;
  customerNo: string;
  email?: string;
}

// Interface untuk data penyesuaian stok
interface StockAdjustmentItem {
  sku: string;
  quantity: number;
}

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

  // Cache mechanism for customer search optimization
  private customerCache = new Map<string, { customer: AccurateCustomer; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  // Track failed searches to avoid repeated expensive operations
  private failedSearchCache = new Map<string, number>();
  private readonly FAILED_SEARCH_TTL = 2 * 60 * 1000; // 2 minutes for failed searches

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

  // =================================================================
  // FUNGSI UNTUK PENYESUAIAN STOK (KEDALUWARSA)
  // =================================================================

  /**
   * Menambahkan job penyesuaian stok ke queue BullMQ.
   * [REVISI] Sekarang HANYA dipanggil untuk fallback.
   */
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
      'adjust-stock', // Nama job baru
      { items, reason },
      {
        removeOnComplete: true,
        removeOnFail: 10, // Simpan 10 job gagal
        attempts: 3, // Coba 3 kali jika gagal
        backoff: { type: 'exponential', delay: 30000 }, // Jeda 30 detik, lalu eksponensial
      },
    );
  }

  // =================================================================
  // --- TAMBAHAN BARU 1 ---
  // FUNGSI UNTUK MENGHAPUS SALES ORDER (RESELLER BATAL)
  // =================================================================
  async addDeleteSalesOrderJobToQueue(salesOrderNumber: string) {
    this.logger.log(
      `Adding "delete-sales-order" job for SO Number: ${salesOrderNumber} to the queue.`,
    );
    await this.syncQueue.add(
      'delete-sales-order', // Nama job baru
      { salesOrderNumber },
      {
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );
  }

  /**
   * [DIREVISI] Memproses job penyesuaian stok dengan memanggil API Accurate.
   * Dipanggil oleh processor (worker).
   */
  async processStockAdjustment(items: StockAdjustmentItem[], reason: string) {
    this.logger.log(
      `[WORKER] Memproses penyesuaian stok... Alasan: ${reason}`,
    );

    try {
      const apiClient = await this.accurateService.getAccurateApiClient();

      // 1. Ambil info Cabang (branchName) dari konfigurasi
      const dbInfo = await this.prisma.accurateOAuth.findFirst();
      if (!dbInfo || !dbInfo.branchName) {
        throw new InternalServerErrorException(
          'Branch name not found in Accurate configuration.',
        );
      }

      // 2. [REVISI] Ambil detail produk (terutama COST) dari database LOKAL
      const itemSkus = items.map((item) => item.sku);
      const productsFromDb = await this.prisma.product.findMany({
        where: {
          sku: { in: itemSkus },
        },
        select: {
          sku: true,
          cost: true, // Mengambil field 'cost' dari Prisma (pastikan sudah migrasi)
        },
      });

      if (productsFromDb.length === 0) {
        throw new Error(
          `Tidak ada produk yang ditemukan di DB lokal untuk SKU: ${itemSkus.join(
            ', ',
          )}`,
        );
      }

      const productCostMap = new Map<string, number>(); // Map<sku, cost>
      productsFromDb.forEach((p) => {
        // Pastikan cost tidak null/undefined.
        if (p.cost === null || p.cost === undefined) {
          this.logger.warn(
            `[WORKER] Cost untuk SKU ${p.sku} adalah null/undefined. Menggunakan 0.`,
          );
          productCostMap.set(p.sku, 0);
        } else {
          productCostMap.set(p.sku, p.cost);
        }
      });

      // 3. [REVISI] Siapkan payload untuk API /api/item-adjustment/save.do
      const adjustmentDetails = items
        .map((item) => {
          const unitCost = productCostMap.get(item.sku);

          if (unitCost === undefined) {
            this.logger.warn(
              `[WORKER] SKU: ${item.sku} tidak ditemukan di DB lokal saat mapping. Item ini akan dilewati.`,
            );
            return null; // Lewati item ini
          }

          // Ini adalah payload yang benar sesuai dokumentasi Accurate
          return {
            itemNo: item.sku, // <-- PERBAIKAN 1: Gunakan SKU
            quantity: item.quantity,
            itemAdjustmentType: 'ADJUSTMENT_IN', // <-- PERBAIKAN 4: Ganti 'INCREASE' menjadi 'ADJUSTMENT_IN'
            unitCost: unitCost, // <-- PERBAIKAN 3: Tambah cost
            // 'warehouseName': dbInfo.branchName // Opsional, jika gudang = nama cabang
          };
        })
        .filter(Boolean); // Hapus item yang null (tidak ditemukan cost-nya)

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
        detailItem: adjustmentDetails, // <-- Payload yang sudah benar
      };

      this.logger.debug(
        `[WORKER] Mengirim payload ke /api/item-adjustment/save.do: ${JSON.stringify(
          payload,
        )}`,
      );

      // 4. Panggil API Accurate
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
        ); // Log detail error
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

  // =================================================================
  // --- TAMBAHAN BARU 2 ---
  // FUNGSI UNTUK MENGHAPUS SALES ORDER (RESELLER BATAL)
  // =================================================================
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

  // =================================================================
  // KODE ASLI ANDA (TIDAK DIUBAH SAMA SEKALI, kecuali syncProductsFromAccurate)
  // =================================================================

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
        // Asumsi 'SHIPPING' adalah item Jasa/Non-Persediaan yang sudah ada di Accurate
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
        number: `SO-${order.orderNumber}`, // Gunakan nomor order unik Anda
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
        ); // Log detail error
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
    // Cek apakah job sync-products sudah ada di queue dan belum aktif/menunggu
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

  /**
   * [DIREVISI] Sinkronisasi produk, sekarang mengambil 'averageCost'
   */
  async syncProductsFromAccurate() {
    this.logger.log('WORKER: Starting product synchronization from Accurate...');
    try {
      const apiClient = await this.accurateService.getAccurateApiClient();
      let page = 1;
      const pageSize = 100; // Ambil 100 produk per halaman
      let hasMore = true;
      let totalSyncedCount = 0;

      while (hasMore) {
        this.logger.log(`WORKER: Fetching product page ${page}...`);
        // [REVISI] Tambahkan 'averageCost' ke fields
        const response = await apiClient.get('/accurate/api/item/list.do', {
          params: {
            fields: 'no,name,itemType,unitPrice,quantity,averageCost',
            'sp.page': page,
            'sp.pageSize': pageSize,
          },
        });

        const itemsFromAccurate = response.data.d;
        if (!itemsFromAccurate || itemsFromAccurate.length === 0) {
          this.logger.warn(
            `WORKER: No items found on page ${page}. Ending sync.`,
          );
          hasMore = false; // Stop jika halaman kosong
          break;
        }

        let pageSyncedCount = 0;
        for (const item of itemsFromAccurate) {
          if (item.itemType !== 'INVENTORY') continue;
          try {
            // ============================================
            // --- INI ADALAH PERBAIKAN STOK "BALIK LAGI" ---
            // ============================================
            await this.prisma.product.upsert({
              where: { sku: item.no },
              // [REVISI] Tambahkan 'cost' saat update
              update: {
                name: item.name,
                price: item.unitPrice || 0, // Default 0 jika null
                // stock: item.quantity || 0, // <-- DIKOMENTARI
                cost: item.averageCost || 0, // Default 0 jika averageCost null/undefined
              },
              // [REVISI] Tambahkan 'cost' saat create
              create: {
                sku: item.no,
                name: item.name,
                price: item.unitPrice || 0, // Default 0 jika null
                stock: item.quantity || 0, // Default 0 jika null
                cost: item.averageCost || 0, // Default 0 jika averageCost null/undefined
                weight: 1000, // Atur default weight jika perlu
              },
            });
            // ============================================
            // --- AKHIR PERBAIKAN ---
            // ============================================
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

        // Cek pagination dari Accurate
        hasMore = response.data.m?.next || false;
        page++;

        // Beri jeda sedikit antar halaman jika perlu
        if (hasMore) {
          await delay(500); // Jeda 500ms
        }
      } // End while loop

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
        // Asumsi 'SHIPPING' adalah item Jasa/Non-Persediaan yang sudah ada di Accurate
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
        // Tambahkan nomor invoice unik Anda
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
        ); // Log detail error
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
      await delay(2000); // Small delay before creating receipt
      const receiptPayload = {
        bankNo: accurateBankNo, // Pastikan ini adalah nomor AKUN bank, bukan ID bank
        transDate: formatDateToAccurate(
          new Date(order.payment.updatedAt || order.payment.createdAt),
        ), // Gunakan tanggal update payment jika ada
        customerNo: accurateCustomer.customerNo,
        branchName: dbInfo.branchName,
        chequeAmount: accurateTotalAmount, // Gunakan total dari invoice Accurate
        detailInvoice: [
          {
            invoiceNo: invoiceNumber, // Gunakan nomor invoice dari Accurate
            paymentAmount: accurateTotalAmount, // Jumlah pembayaran = total invoice
          },
        ],
        // Tambahkan nomor SR unik Anda
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
        ); // Log detail error
        throw new Error(
          receiptResponse.data?.d?.[0] ||
            'Failed while saving Sales Receipt.',
        );
      }
      const receiptId = receiptResponse.data.r.id as number;
      const receiptNumber = receiptResponse.data.r.number as string;

      // Simpan ID SR ke order
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

  /**
   * Optimized customer search with multiple strategies and intelligent pagination
   */
  private async findCustomerByNo(
    apiClient: AxiosInstance,
    customerNo: string,
  ): Promise<AccurateCustomer | null> {
    // Check failed search cache first to avoid repeated expensive operations
    const failedSearch = this.failedSearchCache.get(customerNo);
    if (failedSearch && Date.now() - failedSearch < this.FAILED_SEARCH_TTL) {
      this.logger.debug(
        `[Cache Skip] Pencarian ${customerNo} dilewati karena baru saja gagal.`,
      );
      return null;
    }

    // Strategy 1: Direct ID lookup (if Accurate API supports it)
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
        return directResponse.data.r;
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian Langsung] Tidak berhasil untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 2: Enhanced filter search with exact match
    try {
      const searchResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
            fields: 'id,name,customerNo,email',
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
          return customer;
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian Filter EQUAL] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 3: Search with CONTAINS operator
    try {
      const containsSearchResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
            fields: 'id,name,customerNo,email',
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
          (c: AccurateCustomer) => c.customerNo === customerNo,
        );
        if (exactMatch) {
          this.logger.log(
            `[Pencarian CONTAINS] Pelanggan ${customerNo} ditemukan.`,
          );
          return exactMatch;
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian CONTAINS] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 4: Search with LIKE operator for partial match
    try {
      const likeSearchResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
            fields: 'id,name,customerNo,email',
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
          (c: AccurateCustomer) => c.customerNo === customerNo,
        );
        if (exactMatch) {
          this.logger.log(`[Pencarian LIKE] Pelanggan ${customerNo} ditemukan.`);
          return exactMatch;
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian LIKE] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 5: Try different filter operators for better compatibility
    const filterOperators = ['STARTS_WITH', 'ENDS_WITH'];

    for (const operator of filterOperators) {
      try {
        let filterValue = customerNo;
        if (operator === 'STARTS_WITH') {
          filterValue = customerNo.split('-')[0]; // Try "ECOMM" part
        } else if (operator === 'ENDS_WITH') {
          const parts = customerNo.split('-');
          if (parts.length > 1) {
            filterValue = parts[parts.length - 1]; // Try the ID part
          }
        }

        const operatorSearchResponse = await apiClient.get(
          '/accurate/api/customer/list.do',
          {
            params: {
              fields: 'id,name,customerNo,email',
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
            (c: AccurateCustomer) => c.customerNo === customerNo,
          );
          if (exactMatch) {
            this.logger.log(
              `[Pencarian ${operator}] Pelanggan ${customerNo} ditemukan.`,
            );
            return exactMatch;
          }
        }
      } catch (e) {
        this.logger.debug(
          `[Pencarian ${operator}] Gagal untuk ${customerNo}: ${e.message}`,
        );
      }
    }

    // Strategy 6: Try without any filters but with smarter sorting and smaller pages
    try {
      this.logger.log(
        `[Pencarian Tanpa Filter] Mencoba pencarian tanpa filter untuk ${customerNo}...`,
      );

      // For ECOMM customers, try descending order first (newer customers)
      const sortOrder = customerNo.startsWith('ECOMM-') ? 'DESC' : 'ASC';
      const smallPageResponse = await apiClient.get(
        '/accurate/api/customer/list.do',
        {
          params: {
            fields: 'id,name,customerNo',
            'sp.page': 1,
            'sp.pageSize': 100, // Smaller page size for faster response
            'sort.customerNo': sortOrder,
          },
        },
      );

      if (
        smallPageResponse.data?.s &&
        smallPageResponse.data?.d?.length > 0
      ) {
        const exactMatch = smallPageResponse.data.d.find(
          (c: AccurateCustomer) => c.customerNo === customerNo,
        );
        if (exactMatch) {
          this.logger.log(
            `[Pencarian Tanpa Filter] Pelanggan ${customerNo} ditemukan di halaman 1.`,
          );
          return exactMatch;
        }
      }
    } catch (e) {
      this.logger.debug(
        `[Pencarian Tanpa Filter] Gagal untuk ${customerNo}: ${e.message}`,
      );
    }

    // Strategy 7: Intelligent pagination search (for high-volume scenarios)
    try {
      this.logger.log(
        `[Pencarian Pagination] Memulai pencarian paginated untuk ${customerNo}...`,
      );

      let page = 1;
      let hasMore = true;
      let totalSearched = 0;
      const maxRecordsToSearch = 5000; // Maximum 5000 records to search
      const pageSize = 200;

      // For ECOMM customers, we can optimize by searching recent records first (newer customers)
      const sortOrder = customerNo.startsWith('ECOMM-') ? 'DESC' : 'ASC';

      while (hasMore && totalSearched < maxRecordsToSearch) {
        try {
          const listResponse = await apiClient.get(
            '/accurate/api/customer/list.do',
            {
              params: {
                fields: 'id,name,customerNo',
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
              (c: AccurateCustomer) => c.customerNo === customerNo,
            );
            if (exactMatch) {
              this.logger.log(
                `[Pencarian Pagination] Pelanggan ${customerNo} ditemukan di halaman ${page} (total searched: ${totalSearched}).`,
              );
              return exactMatch;
            }

            // Smart optimization: If we're looking for ECOMM customer and we've passed the likely range, stop
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

            // Add small delay to avoid overwhelming the API
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

    // Mark this search as failed to avoid repeated expensive operations
    this.failedSearchCache.set(customerNo, Date.now());
    this.logger.warn(
      `[Semua Strategi] Pelanggan ${customerNo} tidak ditemukan dengan semua metode pencarian.`,
    );
    return null;
  }

  /**
   * Cached version of customer search for better performance
   */
  private async findCustomerByNoWithCache(
    apiClient: AxiosInstance,
    customerNo: string,
  ): Promise<AccurateCustomer | null> {
    // Check cache first
    const cached = this.customerCache.get(customerNo);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.logger.log(`[Cache Hit] Pelanggan ${customerNo} ditemukan di cache.`);
      return cached.customer;
    }

    // If not in cache, search using optimized method
    const customer = await this.findCustomerByNo(apiClient, customerNo);

    // Cache the result (only cache successful results to avoid caching nulls)
    if (customer) {
      this.customerCache.set(customerNo, { customer, timestamp: Date.now() });
      // Remove from failed search cache if it exists
      this.failedSearchCache.delete(customerNo);
    }

    return customer;
  }

  /**
   * Clear caches - useful for testing or periodic cleanup
   */
  public clearCaches() {
    this.customerCache.clear();
    this.failedSearchCache.clear();
    this.logger.log('Customer search caches cleared.');
  }

  /**
   * Get cache statistics for monitoring
   */
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

    // Use cached search method
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

    // Creation logic
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
        const newAccurateCustomer: AccurateCustomer = createResponse.data.r;
        this.logger.log(
          `[Jalur Kreasi] Pelanggan baru berhasil dibuat: ${newAccurateCustomer.customerNo}`,
        );

        // Cache the new customer
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
          // Clear cache before retry
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
        // Clear cache before retry
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
}