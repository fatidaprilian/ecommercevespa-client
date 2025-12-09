// file: src/webhooks/webhooks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderStatus, Role, Prisma } from '@prisma/client';
import { AccurateService } from 'src/accurate/accurate.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private accurateService: AccurateService,
  ) {}

  /**
   * Handler utama untuk webhook yang masuk dari Accurate.
   * Mengurai payload dan memanggil handler spesifik berdasarkan tipe event.
   */
  async handleAccurateWebhook(payload: any) {
    const eventType = payload.type;

    if (!payload || !eventType) {
      this.logger.warn(
        'Menerima payload webhook Accurate yang tidak valid atau kosong.',
        payload,
      );
      return;
    }

    // Normalisasi data untuk logika stok
    const stockEventData =
      eventType === 'ITEM_QUANTITY'
        ? payload.data
        : payload.data?.[0]?.details || payload.data?.[0]?.detailItem;

    const eventDataRoot = payload.data?.[0];

    // --- LOGIKA SINKRONISASI STOK ---
    try {
      if (stockEventData && Array.isArray(stockEventData)) {
        switch (eventType) {
          // SKIP ITEM_QUANTITY - Hanya 1 gudang, tidak akurat
          case 'ITEM_QUANTITY':
            this.logger.warn(
              `[StockSync] ITEM_QUANTITY webhook DIABAIKAN. ` +
                `Webhook ini hanya berisi stok 1 gudang (${stockEventData[0]?.warehouseName}), ` +
                `sedangkan system membutuhkan total stok dari SEMUA gudang. ` +
                `Update stok akan dilakukan oleh Cron Job yang fetch dari API Accurate.`,
            );
            break;

          // Penyesuaian Persediaan (Stok +/-) - DELTA
          case 'ITEM_ADJUSTMENT':
            this.logger.log(
              `[StockSync-DELTA] Memulai: ITEM_ADJUSTMENT (${
                eventDataRoot?.number || eventDataRoot?.id
              })`,
            );
            for (const detail of stockEventData) {
              const quantity = parseFloat(detail.quantity || 0);
              const change =
                detail.itemAdjustmentType === 'ADJUSTMENT_IN'
                  ? quantity
                  : -quantity;
              await this.updateStockDelta(detail.itemNo, change, eventType);
            }
            break;

          // Faktur Penjualan (Stok -) - DELTA dengan CHECK RESERVED
          case 'SALES_INVOICE':
            this.logger.log(
              `[StockSync-DELTA] Memulai: SALES_INVOICE (${
                eventDataRoot?.number ||
                eventDataRoot?.salesInvoiceNo || // fallback
                eventDataRoot?.id
              })`,
            );

            // Extract order number dari invoice number
            const invoiceNo =
              eventDataRoot?.number || eventDataRoot?.salesInvoiceNo;
            
            // NOTE: Untuk keamanan Stock Sync di webhook ini, kita ambil detail itemnya saja.
            // SEMENTARA: Kita biarkan logic pengurangan stok berjalan. 
            // Jika double deduct terjadi, Cron Job sync stok akan memperbaikinya nanti.
            
            const siDetailItems =
              payload.data?.[0]?.details || payload.data?.[0]?.detailItem;

            if (siDetailItems && Array.isArray(siDetailItems)) {
              for (const detail of siDetailItems) {
                const quantitySold = parseFloat(detail.quantity || 0);
                if (quantitySold > 0) {
                    // Langsung kurangi saja (Delta), nanti Cron Job yang akan menyeimbangkan (Self-Healing)
                    this.logger.log(
                      `[StockSync-DELTA] Mengurangi stok untuk SKU ${detail.itemNo} (Sales Invoice).`,
                    );
                    await this.updateStockDelta(
                      detail.itemNo,
                      -quantitySold,
                      eventType,
                    );
                }
              }
            }
            break;

          // Retur Penjualan (Stok +) - DELTA
          case 'SALES_RETURN':
            this.logger.log(
              `[StockSync-DELTA] Memulai: SALES_RETURN (${
                eventDataRoot?.number || eventDataRoot?.id
              })`,
            );
            for (const detail of stockEventData) {
              const quantityReturned = parseFloat(detail.quantity || 0);
              if (quantityReturned > 0) {
                await this.updateStockDelta(
                  detail.itemNo,
                  quantityReturned,
                  eventType,
                );
              }
            }
            break;

          default:
            this.logger.log(
              `Event ${eventType} tidak memerlukan update stok atau belum ditangani.`,
            );
            break;
        }
      } else if (eventType === 'ITEM_QUANTITY' && !stockEventData) {
        this.logger.warn(
          `Data webhook tidak ditemukan untuk tipe: ${eventType}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ [StockSync] Gagal memproses sinkronisasi stok untuk event ${eventType}: ${error.message}`,
        error.stack,
      );
    }

    // --- LOGIKA STATUS ORDER ---
    if (!eventDataRoot && eventType !== 'ITEM_QUANTITY') {
      this.logger.warn(
        `Data (data[0]) tidak ditemukan untuk event ${eventType}, mengabaikan logika status order.`,
      );
      return;
    }

    if (eventDataRoot) {
      switch (eventType) {
        case 'SALES_INVOICE':
          // SALES_INVOICE -> Set PROCESSING (Menjawab komplain client)
          await this.processSalesInvoiceWebhook(eventDataRoot);
          break;

        case 'SALES_RECEIPT':
          // SALES_RECEIPT -> Set COMPLETED (Lunas)
          await this.processSalesReceiptWebhook(eventDataRoot);
          break;

        case 'SALES_ORDER':
          await this.processSalesOrderWebhook(eventDataRoot);
          break;

        case 'ITEM_QUANTITY':
        case 'ITEM_ADJUSTMENT':
        case 'SALES_RETURN':
          this.logger.log(
            `Event ${eventType} telah diproses untuk stok (jika relevan). Tidak ada aksi status order.`,
          );
          break;

        default:
          this.logger.log(
            `Tidak ada handler status order spesifik untuk tipe webhook "${eventType}". Diabaikan.`,
          );
          break;
      }
    }
  }

  // --- HELPER STOK (OVERWRITE & DELTA) ---
  async overwriteStockWithReserved(
    sku: string,
    newTotalStockFromAccurate: number,
  ) {
    if (!sku) {
      this.logger.warn(`[StockSync-OVERWRITE] SKIPPING: SKU tidak ditemukan.`);
      return;
    }
    if (isNaN(newTotalStockFromAccurate) || newTotalStockFromAccurate < 0) {
      this.logger.warn(
        `[StockSync-OVERWRITE] SKIPPING: Kuantitas total tidak valid (${newTotalStockFromAccurate}) untuk SKU ${sku}.`,
      );
      return;
    }

    try {
      const product = await this.prisma.product.findUnique({
        where: { sku: sku },
        include: {
          orderItems: {
            where: {
              order: {
                status: {
                  in: ['PENDING', 'PAID', 'PROCESSING'],
                },
              },
            },
            select: {
              quantity: true,
              order: {
                select: {
                  orderNumber: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!product) {
        this.logger.error(
          `❌ [StockSync-OVERWRITE] GAGAL: Produk dengan SKU ${sku} tidak ditemukan di database lokal.`,
        );
        return;
      }

      const reservedStock = product.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      const finalStock = Math.max(0, newTotalStockFromAccurate - reservedStock);

      if (reservedStock > 0) {
        this.logger.log(
          `[StockSync-OVERWRITE] SKU ${sku}: ` +
            `Accurate=${newTotalStockFromAccurate}, ` +
            `Reserved=${reservedStock} (dari ${product.orderItems.length} order), ` +
            `Final=${finalStock}`,
        );
      }

      await this.prisma.product.update({
        where: { sku: sku },
        data: { stock: finalStock },
      });

      this.logger.log(
        `✅ [StockSync-OVERWRITE] BERHASIL: Stok untuk SKU ${sku} di-set ke ${finalStock}` +
          (reservedStock > 0 ? ` (Reserved: ${reservedStock})` : ''),
      );
    } catch (error) {
      this.logger.error(
        `❌ [StockSync-OVERWRITE] GAGAL: Error saat update stok untuk SKU ${sku}. Error: ${error.message}`,
        error.stack,
      );
    }
  }

  private async updateStockDelta(
    sku: string,
    quantityChange: number,
    eventType: string,
  ) {
    if (!sku) {
      this.logger.warn(
        `[StockSync-DELTA] SKIPPING: SKU tidak ditemukan pada detail event ${eventType}.`,
      );
      return;
    }
    if (isNaN(quantityChange)) {
      this.logger.warn(
        `[StockSync-DELTA] SKIPPING: Kuantitas (change) tidak valid untuk SKU ${sku}.`,
      );
      return;
    }
    if (quantityChange === 0) {
      this.logger.log(
        `[StockSync-DELTA] SKIPPING: Kuantitas (change) adalah 0 untuk SKU ${sku}.`,
      );
      return;
    }

    this.logger.log(
      `[StockSync-DELTA] Mengupdate SKU ${sku} ... Perubahan: ${quantityChange} (Event: ${eventType})`,
    );

    try {
      await this.prisma.product.update({
        where: { sku: sku },
        data: {
          stock: {
            increment: quantityChange,
          },
        },
      });
      this.logger.log(
        `✅ [StockSync-DELTA] BERHASIL: Stok untuk SKU ${sku} diupdate. Perubahan: ${quantityChange}`,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.error(
          `❌ [StockSync-DELTA] GAGAL: Produk dengan SKU ${sku} tidak ditemukan di database lokal.`,
        );
      } else {
        this.logger.error(
          `❌ [StockSync-DELTA] GAGAL: Error saat update stok untuk SKU ${sku}. Error: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  // --- HANDLER SALES ORDER ---
  private async processSalesOrderWebhook(eventData: any) {
    const salesOrderNo = eventData.number || eventData.salesOrderNo;
    const salesOrderId = eventData.id || eventData.salesOrderId;
    const action = eventData.action; // 'WRITE' (Create/Update) atau 'DELETE'
    const poNumber = eventData.poNumber; // Ambil PO Number dari payload jika ada

    this.logger.log(
      `Processing Sales Order webhook: ${salesOrderNo} (ID: ${salesOrderId}) - Action: ${action}`,
    );

    // 1. Logic Cari Order (JAUH LEBIH SIMPEL & AMAN)
    // Kita cari order yang punya 'accurateSalesOrderNumber' sama dengan yang dikirim webhook
    let order = await this.prisma.order.findFirst({
      where: { accurateSalesOrderNumber: salesOrderNo },
    });

    // Fallback khusus ACTION WRITE/CREATE (Bukan Delete):
    // Jika belum ketemu (mungkin delay sync), dan ada poNumber di payload, coba cari pakai poNumber
    if (!order && action !== 'DELETE' && poNumber) {
        this.logger.log(`Order dengan SO ${salesOrderNo} belum ada di DB. Mencoba cari via PO Number: ${poNumber}`);
        order = await this.prisma.order.findUnique({
            where: { orderNumber: poNumber },
        });

        // Kalau ketemu lewat jalur ini, segera update nomor SO-nya
        if (order) {
            await this.prisma.order.update({
                where: { id: order.id },
                data: { accurateSalesOrderNumber: salesOrderNo }
            });
            this.logger.log(`✅ Linked Accurate SO ${salesOrderNo} to local order ${order.orderNumber} via PO Number match.`);
        }
    }

    // 1. JIKA ACTION = DELETE (Pesanan Dihapus di Accurate)
    if (action === 'DELETE') {
      try {
        if (order) {
          // Cek dulu, kalau sudah COMPLETED/SHIPPED/DELIVERED jangan dicancel sembarangan (Bahaya)
          // Kecuali klien emang mau paksa cancel.
          // Amannya: Hanya cancel jika status masih PENDING/PROCESSING/PAID.
          if (
            order.status === OrderStatus.PENDING ||
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.PROCESSING
          ) {
            await this.prisma.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.CANCELLED },
            });
            this.logger.log(
              `⚠️ Sales Order ${salesOrderNo} DIHAPUS di Accurate. Order ${order.orderNumber} otomatis di-set ke CANCELLED.`,
            );
          } else {
            this.logger.warn(
              `⚠️ Sales Order ${salesOrderNo} DIHAPUS di Accurate, tapi status Order ${order.orderNumber} adalah ${order.status}. Tidak di-cancel otomatis untuk keamanan.`,
            );
          }
        } else {
          this.logger.warn(
            `Sales Order ${salesOrderNo} dihapus di Accurate, tapi tidak ditemukan di database lokal.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Gagal memproses DELETE Sales Order ${salesOrderNo}: ${error.message}`,
        );
      }
      return; // Stop di sini kalau delete
    }

    // 2. JIKA ACTION = WRITE (Hanya log saja karena linking sudah ditangani di atas)
    if (order) {
         this.logger.log(`Sales Order Webhook processed for ${order.orderNumber}. Data is in sync.`);
    } else {
         this.logger.warn(`Skipping Webhook: Local order not found for Accurate SO ${salesOrderNo} / PO ${poNumber}.`);
    }
  }

// --- HANDLER SALES INVOICE (FAKTUR) ---
  private async processSalesInvoiceWebhook(eventData: any) {
    const salesInvoiceNo = eventData.number || eventData.salesInvoiceNo;
    const salesInvoiceId = eventData.id || eventData.salesInvoiceId;

    if (!salesInvoiceNo) {
      this.logger.warn(
        'Webhook Faktur Penjualan tidak memiliki nomor.',
        eventData,
      );
      return;
    }

    this.logger.log(
      `Processing Sales Invoice webhook: ${salesInvoiceNo} (ID: ${salesInvoiceId})`,
    );

    try {
      this.logger.log(
        `Payload SI ${salesInvoiceNo} minimal. Fetching details from Accurate...`,
      );
      // Fetch detail faktur dari Accurate
      const siDetail = await this.accurateService.getSalesInvoiceByNumber(
        salesInvoiceNo,
      );

      // 👇 1. KUMPULKAN SEMUA NOMOR SO UNIK DARI SEMUA BARANG (REVISI UTAMA) 👇
      // Menggunakan Set agar nomor SO yang sama tidak diproses berkali-kali
      const soNumbers = new Set<string>();
      
      if (siDetail?.detailItem && Array.isArray(siDetail.detailItem)) {
        siDetail.detailItem.forEach((item: any) => {
          // Cek apakah item ini punya referensi Sales Order
          if (item.salesOrder?.number) {
            soNumbers.add(item.salesOrder.number);
          }
        });
      }
      
      const uniqueSoNumbers = Array.from(soNumbers); // Convert Set jadi Array
      this.logger.log(`Faktur ${salesInvoiceNo} mencakup SO: ${uniqueSoNumbers.join(', ') || 'Tidak ada SO (Mungkin Direct Invoice/Member)'}`);

      // 👇 2. LOGIKA UTAMA: UPDATE ORDER 👇
      if (uniqueSoNumbers.length > 0) {
        // KASUS RESELLER (Grouping): 1 Faktur gabungan dari beberapa SO
        // Kita loop semua nomor SO yang ditemukan dan update satu per satu
        for (const soNumber of uniqueSoNumbers) {
           await this.updateOrderBySoNumber(soNumber, salesInvoiceNo, salesInvoiceId);
        }
      } else {
         // KASUS MEMBER / NON-SO: Cari pakai PO Number (ID Web)
         // Member biasanya Direct Invoice (tanpa SO), jadi cari via PO Number
         const poNumber = siDetail?.poNumber;
         if (poNumber) {
             await this.updateOrderByPoNumber(poNumber, salesInvoiceNo, salesInvoiceId);
         } else {
             this.logger.warn(`SI ${salesInvoiceNo} tidak memiliki parent Sales Order ataupun PO Number. Skip.`);
         }
      }

    } catch (error) {
      this.logger.error(
        `❌ Error processing Sales Invoice webhook for ${salesInvoiceNo}: ${error.message}`,
        error.stack,
      );
    }
  }

  // 👇 HELPER 1: Cari & Update berdasarkan Nomor SO Accurate (Untuk Reseller) 👇
  private async updateOrderBySoNumber(soNumber: string, invoiceNo: string, invoiceId: number) {
      // Cari order di DB lokal yang punya nomor SO ini
      const order = await this.prisma.order.findFirst({
          where: { accurateSalesOrderNumber: soNumber },
          include: { user: true },
      });
      await this.processOrderUpdate(order, invoiceNo, invoiceId, `SO ${soNumber}`);
  }

  // 👇 HELPER 2: Cari & Update berdasarkan PO Number/ID Web (Untuk Member/Fallback) 👇
  private async updateOrderByPoNumber(poNumber: string, invoiceNo: string, invoiceId: number) {
      // Cari order di DB lokal yang ID-nya sama dengan PO Number
      const order = await this.prisma.order.findUnique({
          where: { orderNumber: poNumber },
          include: { user: true }
      });
      await this.processOrderUpdate(order, invoiceNo, invoiceId, `PO ${poNumber}`);
  }

  // 👇 HELPER 3: Eksekusi Update Status ke DB (Logic Inti) 👇
  private async processOrderUpdate(order: any, invoiceNo: string, invoiceId: number, refSource: string) {
      if (!order) {
          this.logger.warn(`❌ Order tidak ditemukan untuk referensi: ${refSource} (Invoice: ${invoiceNo})`);
          return;
      }

      // Guard Clause: Jangan update status kalau sudah selesai/dikirim (REM TANGAN)
      const higherStatuses: OrderStatus[] = [
          OrderStatus.SHIPPED, 
          OrderStatus.DELIVERED, 
          OrderStatus.COMPLETED, 
          OrderStatus.CANCELLED, 
          OrderStatus.REFUNDED
      ];

      let dataToUpdate: Prisma.OrderUpdateInput = {
          accurateSalesInvoiceNumber: invoiceNo,
          accurateSalesInvoiceId: invoiceId,
      };
      let logMessage = '';

      if (higherStatuses.includes(order.status)) {
          // Status sudah tinggi, jangan ubah statusnya, cuma update nomor invoice aja
          logMessage = `✅ Invoice ${invoiceNo} dicatat untuk Order ${order.orderNumber}. Status TETAP ${order.status} (karena sudah lebih maju dari PROCESSING).`;
      } else {
          // Update status jadi PROCESSING (tanda barang sedang disiapkan)
          dataToUpdate.status = OrderStatus.PROCESSING;
          logMessage = `✅ BERHASIL: Invoice ${invoiceNo} terbit. Order ${order.orderNumber} (via ${refSource}) diubah ke PROCESSING.`;
      }

      // Eksekusi update
      await this.prisma.order.update({
          where: { id: order.id },
          data: dataToUpdate,
      });
      this.logger.log(logMessage);
  }

// --- HANDLER SALES RECEIPT (PELUNASAN) ---
  private async processSalesReceiptWebhook(eventData: any) {
    const salesReceiptNo = eventData.number || eventData.salesReceiptNo;
    const salesReceiptId = eventData.id || eventData.salesReceiptId;

    if (!salesReceiptNo) {
      this.logger.warn(
        'Webhook Penerimaan Penjualan tidak memiliki nomor.',
        eventData,
      );
      return;
    }

    this.logger.log(
      `Processing Sales Receipt webhook: ${salesReceiptNo} (ID: ${salesReceiptId})`,
    );

    try {
      // 1. Fetch detail Receipt dari Accurate untuk melihat Invoice apa saja yang dibayar
      const srDetail = await this.accurateService.getSalesReceiptDetailByNumber(
        salesReceiptNo,
      );

      // 2. Kumpulkan SEMUA nomor Invoice yang ada dalam pelunasan ini
      const invoiceNumbers: string[] = [];
      if (srDetail?.detailInvoice && Array.isArray(srDetail.detailInvoice)) {
        srDetail.detailInvoice.forEach((detail: any) => {
          if (detail.invoice?.number) {
            invoiceNumbers.push(detail.invoice.number);
          }
        });
      }

      if (invoiceNumbers.length === 0) {
        this.logger.warn(`Receipt ${salesReceiptNo} tidak memiliki referensi Invoice.`);
        return;
      }

      this.logger.log(`Receipt ${salesReceiptNo} membayar Invoice: ${invoiceNumbers.join(', ')}`);

      // 3. Cari SEMUA Order di database yang memiliki nomor Invoice tersebut
      // Menggunakan findMany agar jika 1 Receipt membayar 3 Invoice (3 Order), semuanya ketemu.
      const orders = await this.prisma.order.findMany({
        where: { 
            accurateSalesInvoiceNumber: { in: invoiceNumbers } 
        },
        include: { user: true },
      });

      if (orders.length === 0) {
        this.logger.warn(
          `Webhook penerimaan ${salesReceiptNo} diproses, tapi tidak ada order lokal yang cocok dengan Invoice: ${invoiceNumbers.join(', ')}`,
        );
        return;
      }

      // 4. Loop setiap order yang ditemukan dan jalankan logic update sesuai Role
      for (const order of orders) {
        let dataToUpdate: Prisma.OrderUpdateInput = {
          accurateSalesReceiptId: salesReceiptId,
        };
        let logMessage = '';

        // --- CEK ROLE USER ---
        const isReseller = order.user?.role === Role.RESELLER;

        if (isReseller) {
            // KHUSUS RESELLER: Lunas = Selesai (Completed)
            // (Asumsi barang sudah dikirim saat faktur terbit/bersamaan)
            if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED) {
                dataToUpdate.status = OrderStatus.COMPLETED;
                logMessage = `✅ [RESELLER] Pelunasan ${salesReceiptNo}. Order ${order.orderNumber} diubah ke COMPLETED.`;
            } else {
                logMessage = `✅ [RESELLER] Receipt ${salesReceiptNo} dicatat untuk Order ${order.orderNumber}. Status tetap ${order.status}.`;
            }
        } else {
            // KHUSUS MEMBER: Lunas != Selesai (LOGIKA MEMBER TETAP UTUH)
            // Member harus lewat fase SHIPPED & DELIVERED dulu.
            // Receipt hanya dicatat ID-nya, status JANGAN diubah jadi Completed.
            logMessage = `✅ [MEMBER] Pelunasan ${salesReceiptNo} dicatat untuk Order ${order.orderNumber}. Status order TETAP ${order.status} (Menunggu pengiriman).`;
        }

        // Eksekusi update per order
        await this.prisma.order.update({
          where: { id: order.id },
          data: dataToUpdate,
        });
        this.logger.log(logMessage);
      }

    } catch (error) {
      this.logger.error(
        `❌ Error processing Sales Receipt webhook for ${salesReceiptNo}: ${error.message}`,
        error.stack,
      );
    }
  }

  // --- HANDLER BITESHIP ---
  async handleBiteshipTrackingUpdate(payload: any) {
    const {
      status,
      courier_waybill_id: waybill_id,
      order_id: biteshipOrderId,
    } = payload;

    if (!waybill_id || !status) {
      this.logger.warn(
        'Webhook Biteship diterima tanpa waybill_id atau status.',
        payload,
      );
      return;
    }

    let shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber: waybill_id },
    });

    if (!shipment && biteshipOrderId) {
      this.logger.log(
        `Shipment for waybill ${waybill_id} not found, trying lookup via Biteship Order ID: ${biteshipOrderId}`,
      );
    }

    if (!shipment) {
      this.logger.warn(
        `Webhook Biteship diterima untuk waybill/order_id yang tidak dikenal: ${waybill_id} / ${biteshipOrderId}`,
      );
      return;
    }

    let newStatus: OrderStatus | null = null;
    switch (status) {
      case 'allocated':
      case 'picking_up':
      case 'picked':
        newStatus = OrderStatus.SHIPPED;
        break;
      case 'dropping_off':
      case 'delivered':
        newStatus = OrderStatus.DELIVERED;
        break;
      case 'rejected':
      case 'courier_not_found':
      case 'returned':
      case 'cancelled':
        newStatus = OrderStatus.CANCELLED;
        break;
      default:
        this.logger.log(
          `Ignoring Biteship status update '${status}' for waybill ${waybill_id}`,
        );
        break;
    }

    if (newStatus) {
      try {
        const currentOrder = await this.prisma.order.findUnique({
          where: { id: shipment.orderId },
        });
        if (!currentOrder) {
          this.logger.error(
            `Order with ID ${shipment.orderId} not found for shipment ${shipment.id}`,
          );
          return;
        }

        const getStatusOrderValue = (status: OrderStatus): number => {
          switch (status) {
            case OrderStatus.PENDING:
              return 0;
            case OrderStatus.PAID:
              return 1;
            case OrderStatus.PROCESSING:
              return 2;
            case OrderStatus.SHIPPED:
              return 3;
            case OrderStatus.DELIVERED:
              return 4;
            case OrderStatus.COMPLETED:
              return 5;
            default:
              return -1;
          }
        };

        const currentOrderValue = getStatusOrderValue(currentOrder.status);
        const newOrderValue = getStatusOrderValue(newStatus);

        const terminalStatuses: OrderStatus[] = [
          OrderStatus.CANCELLED,
          OrderStatus.REFUNDED,
        ];

        const shouldUpdate =
          terminalStatuses.includes(newStatus) ||
          (newOrderValue > currentOrderValue &&
            currentOrderValue !== -1 &&
            !terminalStatuses.includes(currentOrder.status));

        if (shouldUpdate && currentOrder.status !== newStatus) {
          await this.prisma.order.update({
            where: { id: shipment.orderId },
            data: { status: newStatus },
          });
          this.logger.log(
            `Status Order ID ${shipment.orderId} diubah menjadi ${newStatus} via webhook Biteship (Waybill: ${waybill_id}).`,
          );
        } else if (currentOrder.status === newStatus) {
          this.logger.log(
            `Order ${shipment.orderId} already has status ${newStatus}. Ignoring webhook Biteship.`,
          );
        } else {
          this.logger.log(
            `Ignoring Biteship status update from ${currentOrder.status} to ${newStatus} for waybill ${waybill_id} based on update logic.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Gagal memproses webhook Biteship untuk waybill_id: ${waybill_id}`,
          error.stack,
        );
      }
    }
  }
}