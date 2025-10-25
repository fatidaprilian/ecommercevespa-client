// file: src/webhooks/webhooks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// Tambahkan 'Prisma' untuk error handling
import { OrderStatus, Role, Prisma } from '@prisma/client';
import { AccurateService } from 'src/accurate/accurate.service'; // Pastikan path ini benar

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private accurateService: AccurateService, // Pastikan AccurateService di-inject
  ) {}

  /**
   * Handler utama untuk webhook yang masuk dari Accurate.
   * Mengurai payload dan memanggil handler spesifik berdasarkan tipe event.
   */
  async handleAccurateWebhook(payload: any) {
    // Tipe payload 'ITEM_QUANTITY' berbeda, data-nya tidak di dalam data[0]
    // Kita cek jika tipe ada di root payload
    const eventType = payload.type;

    if (!payload || !eventType) {
      this.logger.warn(
        'Menerima payload webhook Accurate yang tidak valid atau kosong.',
        payload,
      );
      return;
    }

    // Untuk 'ITEM_QUANTITY', 'data' adalah array di root.
    // Untuk event lain, 'data' adalah array di dalam 'data[0]'.
    // Kita normalisasi ini untuk logika stok.
    const stockEventData =
      eventType === 'ITEM_QUANTITY'
        ? payload.data
        : payload.data?.[0]?.details || // Coba 'details' dulu (umumnya Item Adj.)
          payload.data?.[0]?.detailItem; // Coba 'detailItem' (umumnya Faktur/Retur)

    // Data root (data[0]) tetap dibutuhkan untuk logika status order
    const eventDataRoot = payload.data?.[0];

    // --- LOGIKA SINKRONISASI STOK ---
    try {
      // Hanya proses stok jika ada data relevan
      if (stockEventData && Array.isArray(stockEventData)) {
        switch (eventType) {
          // [SKIP] ITEM_QUANTITY - Hanya 1 gudang, tidak akurat untuk total stok
          // Biarkan Cron Job (sync-products) yang handle update stok dari API Accurate
          case 'ITEM_QUANTITY':
            this.logger.warn(
              `[StockSync] ITEM_QUANTITY webhook DIABAIKAN. ` +
              `Webhook ini hanya berisi stok 1 gudang (${stockEventData[0]?.warehouseName}), ` +
              `sedangkan system membutuhkan total stok dari SEMUA gudang. ` +
              `Update stok akan dilakukan oleh Cron Job yang fetch dari API Accurate.`
            );
            break;

          // Kasus: Penyesuaian Persediaan (Stok +/-) - DELTA
          case 'ITEM_ADJUSTMENT': // Gunakan nama event dari Accurate
            this.logger.log(
              `[StockSync-DELTA] Memulai: ITEM_ADJUSTMENT (${
                eventDataRoot?.number || eventDataRoot?.id // Gunakan nomor/id dari data root
              })`,
            );
            for (const detail of stockEventData) { // Iterasi data detail stok
              // Tentukan perubahan (+/-)
              const quantity = parseFloat(detail.quantity || 0);
              const change =
                detail.itemAdjustmentType === 'ADJUSTMENT_IN' // Nama field dari Accurate
                  ? quantity
                  : -quantity;
              await this.updateStockDelta(detail.itemNo, change, eventType);
            }
            break;

          // Kasus: Faktur Penjualan (Stok -) - DELTA
          case 'SALES_INVOICE': // Gunakan nama event dari Accurate
            this.logger.log(
              `[StockSync-DELTA] Memulai: SALES_INVOICE (${
                eventDataRoot?.number || eventDataRoot?.id
              })`,
            );
            for (const detail of stockEventData) { // Iterasi data detail stok
              // Hanya proses item fisik (jika ada info tipe item)
              // if (detail.itemType !== 'INVENTORY') continue;
              const quantitySold = parseFloat(detail.quantity || 0);
              if (quantitySold > 0) {
                await this.updateStockDelta(
                  detail.itemNo,
                  -quantitySold,
                  eventType,
                );
              }
            }
            break;

          // Kasus: Retur Penjualan (Stok +) - DELTA
          case 'SALES_RETURN': // Gunakan nama event dari Accurate
            this.logger.log(
              `[StockSync-DELTA] Memulai: SALES_RETURN (${
                eventDataRoot?.number || eventDataRoot?.id
              })`,
            );
            for (const detail of stockEventData) { // Iterasi data detail stok
              // Hanya proses item fisik
              // if (detail.itemType !== 'INVENTORY') continue;
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

           // Tambahkan case lain yang mempengaruhi stok jika perlu
           // Misal: PURCHASE_INVOICE, TRANSFER_ITEM, etc.

           default:
             this.logger.log(`Event ${eventType} tidak memerlukan update stok atau belum ditangani.`);
             break;
        }
      } else if (eventType === 'ITEM_QUANTITY' && !stockEventData) {
         this.logger.warn(`Data webhook tidak ditemukan untuk tipe: ${eventType}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ [StockSync] Gagal memproses sinkronisasi stok untuk event ${eventType}: ${error.message}`,
        error.stack,
      );
    }
    // --- AKHIR DARI LOGIKA SINKRONISASI STOK ---

    // --- LOGIKA STATUS ORDER (YANG SUDAH ADA - TIDAK DIUBAH) ---
    // Pastikan eventDataRoot ada sebelum menjalankan switch ini
    if (!eventDataRoot && eventType !== 'ITEM_QUANTITY') {
      this.logger.warn(
        `Data (data[0]) tidak ditemukan untuk event ${eventType}, mengabaikan logika status order.`,
      );
      return; // Stop di sini jika tidak ada data root untuk status order
    }

    // Jalankan logika status order HANYA jika eventDataRoot ada
    if (eventDataRoot) {
        switch (eventType) {
          case 'SALES_INVOICE':
            // Cek apakah invoice sudah lunas sebelum memproses
            if (eventDataRoot.status === 'LUNAS') {
                await this.processSalesInvoiceWebhook(eventDataRoot);
            } else {
                 this.logger.log(`Mengabaikan webhook SALES_INVOICE ${eventDataRoot.number || eventDataRoot.id} karena status bukan LUNAS (${eventDataRoot.status})`);
            }
            break;

          case 'SALES_RECEIPT':
            await this.processSalesReceiptWebhook(eventDataRoot);
            break;

          case 'SALES_ORDER':
            await this.processSalesOrderWebhook(eventDataRoot);
            break;

          // Event yang hanya untuk stok akan diabaikan di sini
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

  /**
   * [FUNGSI BARU] Helper untuk update stok (OVERWRITE / SET).
   * Digunakan untuk event 'ITEM_QUANTITY'.
   * 
   * CATATAN: Fungsi ini SKIP webhook ITEM_QUANTITY karena hanya berisi stok 1 gudang.
   * Update stok OVERWRITE hanya dilakukan oleh Cron Job yang fetch dari API Accurate.
   */
  private async overwriteStock(sku: string, newTotalStock: number) {
    if (!sku) {
      this.logger.warn(`[StockSync-OVERWRITE] SKIPPING: SKU tidak ditemukan.`);
      return;
    }
    if (isNaN(newTotalStock) || newTotalStock < 0) {
      this.logger.warn(
        `[StockSync-OVERWRITE] SKIPPING: Kuantitas total tidak valid (${newTotalStock}) untuk SKU ${sku}.`,
      );
      return;
    }

    this.logger.log(
      `[StockSync-OVERWRITE] Menimpa SKU ${sku} ... Stok Baru: ${newTotalStock}`,
    );

    try {
      // HITUNG RESERVED STOCK (dari order yang belum selesai)
      const product = await this.prisma.product.findUnique({
        where: { sku: sku },
        include: {
          orderItems: {
            where: {
              order: {
                status: {
                  in: ['PENDING', 'PAID', 'PROCESSING'] // Order yang stoknya masih "reserved"
                }
              }
            },
            select: {
              quantity: true
            }
          }
        }
      });

      if (!product) {
        this.logger.error(
          `❌ [StockSync-OVERWRITE] GAGAL: Produk dengan SKU ${sku} tidak ditemukan di database lokal.`,
        );
        return;
      }

      // Hitung total reserved
      const reservedStock = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Stok final = Stok dari Accurate - Reserved
      const finalStock = Math.max(0, newTotalStock - reservedStock);

      this.logger.log(
        `[StockSync-OVERWRITE] SKU ${sku}: Accurate=${newTotalStock}, Reserved=${reservedStock}, Final=${finalStock}`
      );

      await this.prisma.product.update({
        where: { sku: sku },
        data: {
          stock: finalStock,
        },
      });
      
      this.logger.log(
        `✅ [StockSync-OVERWRITE] BERHASIL: Stok untuk SKU ${sku} di-set ke ${finalStock} (Accurate: ${newTotalStock}, Reserved: ${reservedStock})`,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.error(
          `❌ [StockSync-OVERWRITE] GAGAL: Produk dengan SKU ${sku} tidak ditemukan di database lokal.`,
        );
      } else {
        this.logger.error(
          `❌ [StockSync-OVERWRITE] GAGAL: Error saat update stok untuk SKU ${sku}. Error: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * [FUNGSI LAMA - Dipertahankan] Helper untuk update stok (DELTA / INCREMENT).
   * Digunakan untuk event 'ITEM_ADJUSTMENT', 'SALES_INVOICE', 'SALES_RETURN'.
   */
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
        error.code === 'P2025' // Record not found
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
       // Tidak melempar error agar webhook lain (jika ada) tetap diproses
    }
  }

  // --- FUNGSI-FUNGSI YANG SUDAH ADA (TIDAK BERUBAH) ---

  private async processSalesOrderWebhook(eventData: any) {
    const { number: salesOrderNo, id: salesOrderId, action } = eventData; // Gunakan 'number' jika ada

    this.logger.log(
      `Processing Sales Order webhook: ${salesOrderNo} (ID: ${salesOrderId}) - Action: ${action}`,
    );

    // Anda bisa tambahkan logika di sini jika diperlukan saat SO dibuat/diupdate
    // Misalnya, mencatat SO ID ke order lokal jika belum ada
    if (salesOrderNo) {
        try {
            // Mencari berdasarkan nomor order web yang diekstrak dari nomor SO Accurate
            const orderNumberFromSO = salesOrderNo.replace(/^SO-/,'');
            const order = await this.prisma.order.findUnique({
                 where: { orderNumber: orderNumberFromSO }
            });
            if(order && !order.accurateSalesOrderNumber) {
                 await this.prisma.order.update({
                      where: { id: order.id },
                      data: { accurateSalesOrderNumber: salesOrderNo }
                 });
                 this.logger.log(`Linked Accurate SO ${salesOrderNo} to local order ${order.orderNumber}`);
            } else if (order && order.accurateSalesOrderNumber === salesOrderNo) {
                 this.logger.log(`Accurate SO ${salesOrderNo} already linked to local order ${order.orderNumber}.`);
            } else if (!order) {
                 this.logger.warn(`Local order not found for Accurate SO ${salesOrderNo} (extracted order number: ${orderNumberFromSO}).`);
            }
        } catch (linkError) {
             this.logger.error(`Error linking SO ${salesOrderNo}: ${linkError.message}`);
        }
    }
  }

  private async processSalesInvoiceWebhook(eventData: any) {
    const salesInvoiceNo = eventData.number; // Gunakan 'number' jika ada
    const salesInvoiceId = eventData.id;

    if (!salesInvoiceNo) {
      this.logger.warn(
        'Webhook Faktur Penjualan tidak memiliki nomor ("number").',
        eventData,
      );
      return;
    }

    this.logger.log(
      `Processing Sales Invoice webhook: ${salesInvoiceNo} (ID: ${salesInvoiceId})`,
    );

    // Coba cari order lokal berdasarkan nomor invoice Accurate
    // Asumsi format nomor invoice: INV-{orderNumber}
    const orderNumberFromInvoice = salesInvoiceNo.replace(/^INV-/,'');
    if (!orderNumberFromInvoice) {
        this.logger.warn(`Tidak bisa ekstrak nomor order dari nomor invoice ${salesInvoiceNo}`);
        return;
    }

    try {
        const order = await this.prisma.order.findUnique({
            where: { orderNumber: orderNumberFromInvoice },
            include: { user: true } // Include user jika perlu cek role
        });

        if (order) {
            // Cek apakah invoice sudah tercatat
            if (order.accurateSalesInvoiceNumber === salesInvoiceNo) {
                 this.logger.log(`Invoice ${salesInvoiceNo} sudah tercatat untuk order ${order.orderNumber}. Mengabaikan.`);
                 return;
            }

            // Jika belum lunas, tidak perlu update status, cukup catat nomor SI
            if (eventData.status !== 'LUNAS') {
                await this.prisma.order.update({
                     where: { id: order.id },
                     data: { accurateSalesInvoiceNumber: salesInvoiceNo, accurateSalesInvoiceId: salesInvoiceId } // Catat ID juga
                });
                this.logger.log(`✅ Invoice ${salesInvoiceNo} (BELUM LUNAS) dicatat untuk order ${order.orderNumber}. Status tidak diubah.`);
                return;
            }

            // Jika sudah LUNAS dan status order masih PENDING/PAID
            // Tentukan status baru. Jika Reseller, bisa langsung COMPLETED. Jika Member, PROCESSING.
            const newStatus = (order.user?.role === Role.RESELLER) ? OrderStatus.COMPLETED : OrderStatus.PROCESSING;

            if (order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID) {
                await this.prisma.order.update({
                where: { id: order.id },
                data: {
                    accurateSalesInvoiceNumber: salesInvoiceNo,
                    accurateSalesInvoiceId: salesInvoiceId, // Simpan ID SI juga
                    status: newStatus,
                },
                });
                this.logger.log(
                `✅ BERHASIL: Invoice ${salesInvoiceNo} (LUNAS) di-link ke order ${order.id} (${order.orderNumber}). Status diubah ke ${newStatus}.`,
                );
            } else {
                // Jika status sudah lebih lanjut (PROCESSING, SHIPPED, etc.), cukup catat nomor SI jika belum ada
                 if (!order.accurateSalesInvoiceNumber) {
                     await this.prisma.order.update({
                          where: { id: order.id },
                          data: { accurateSalesInvoiceNumber: salesInvoiceNo, accurateSalesInvoiceId: salesInvoiceId }
                     });
                     this.logger.log(`✅ Invoice ${salesInvoiceNo} (LUNAS) dicatat untuk order ${order.orderNumber} (status ${order.status}).`);
                 } else {
                    this.logger.log(
                    `Pesanan ${order.id} sudah dalam status ${order.status}. Mengabaikan update status dari webhook faktur lunas ${salesInvoiceNo}.`,
                    );
                 }
            }
        } else {
            this.logger.warn(
            `❌ Order tidak ditemukan untuk nomor: ${orderNumberFromInvoice} (dari Invoice ${salesInvoiceNo})`,
            );
        }

    } catch (error) {
         this.logger.error(
            `❌ Error processing Sales Invoice webhook for ${salesInvoiceNo}: ${error.message}`,
            error.stack,
         );
    }
  }

   private async processSalesReceiptWebhook(eventData: any) {
    const salesReceiptNo = eventData.number; // Gunakan 'number'
    const salesReceiptId = eventData.id;

    if (!salesReceiptNo) {
      this.logger.warn(
        'Webhook Penerimaan Penjualan tidak memiliki nomor ("number").',
        eventData,
      );
      return;
    }

    this.logger.log(`Processing Sales Receipt webhook: ${salesReceiptNo} (ID: ${salesReceiptId})`);

    // Ambil detail invoice dari payload receipt
    const detailInvoice = eventData.detailInvoice?.[0];
    const invoiceNumber = detailInvoice?.invoice?.number;

    if (!invoiceNumber) {
        this.logger.warn(`Tidak dapat menemukan nomor faktur terkait dalam detail SR ${salesReceiptNo}`);
        return;
    }

     this.logger.log(
       `Menemukan Faktur Penjualan terkait: ${invoiceNumber} untuk Penerimaan Penjualan: ${salesReceiptNo}`,
     );

    try {
        const order = await this.prisma.order.findFirst({
            where: { accurateSalesInvoiceNumber: invoiceNumber }, // Cari order berdasarkan nomor invoice
            include: { user: true }
        });

         if (order) {
            // Jika order masih PENDING atau PAID, update ke PROCESSING
            // Jika sudah PROCESSING atau lebih lanjut, cukup catat ID SR jika belum ada
            let dataToUpdate: Prisma.OrderUpdateInput = {};
            let logMessage = '';

            // Hanya update status jika order belum selesai/dikirim/diproses
            if (order.status === OrderStatus.PENDING || order.status === OrderStatus.PAID) {
                dataToUpdate.status = OrderStatus.PROCESSING;
                dataToUpdate.accurateSalesReceiptId = salesReceiptId; // Catat ID SR
                logMessage = `✅ BERHASIL: Pembayaran untuk pesanan ${order.id} via SR ${salesReceiptNo} telah dikonfirmasi. Status diubah ke PROCESSING.`;
            } else {
                 // Jika status sudah lanjut tapi SR ID belum tercatat, catat SR ID nya
                 if (!order.accurateSalesReceiptId) {
                    dataToUpdate.accurateSalesReceiptId = salesReceiptId;
                    logMessage = `✅ Receipt ID ${salesReceiptId} dicatat untuk order ${order.id} (status ${order.status}). Status tidak diubah.`;
                 } else {
                    logMessage = `Status pesanan ${order.id} adalah ${order.status}. Mengabaikan webhook penerimaan ${salesReceiptNo}.`;
                 }
            }

            // Lakukan update jika ada data yang perlu diubah
            if (Object.keys(dataToUpdate).length > 0) {
                 await this.prisma.order.update({
                    where: { id: order.id },
                    data: dataToUpdate
                 });
            }

            this.logger.log(logMessage);

        } else {
            this.logger.warn(
            `Webhook penerimaan ${salesReceiptNo} diproses, tetapi pesanan yang cocok untuk invoice ${invoiceNumber} tidak ditemukan.`,
            );
        }

    } catch (error) {
         this.logger.error(
            `❌ Error processing Sales Receipt webhook for ${salesReceiptNo}: ${error.message}`,
            error.stack,
         );
    }
  }

  // --- handleBiteshipTrackingUpdate (REVISI ERROR TYPESCRIPT) ---
  async handleBiteshipTrackingUpdate(payload: any) {
    const { status, courier_waybill_id: waybill_id, order_id: biteshipOrderId } = payload; // Ambil biteshipOrderId juga

    if (!waybill_id || !status) {
      this.logger.warn(
        'Webhook Biteship diterima tanpa waybill_id atau status.',
        payload,
      );
      return;
    }

    // Coba cari shipment berdasarkan waybill_id DULU (lebih akurat)
    let shipment = await this.prisma.shipment.findFirst({
        where: { trackingNumber: waybill_id },
    });

    // Jika tidak ketemu via waybill (mungkin update status sebelum waybill tercatat), coba via order_id Biteship
    if (!shipment && biteshipOrderId) {
        this.logger.log(`Shipment for waybill ${waybill_id} not found, trying lookup via Biteship Order ID: ${biteshipOrderId}`);
        // Asumsi Anda menyimpan biteshipOrderId di tabel Order atau Shipment
        // Ganti 'biteshipOrderId' dengan nama field yang benar di model Anda
        /*
        const orderWithBiteshipId = await this.prisma.order.findFirst({
            where: { biteshipOrderId: biteshipOrderId }, // FIELD INI TIDAK ADA DI SKEMA ANDA
            include: { shipment: true }
        });
        shipment = orderWithBiteshipId?.shipment;
        */
        // Kode di atas tetap dikomentari karena field tidak ada di schema.prisma
    }


    if (!shipment) {
       this.logger.warn(
          `Webhook Biteship diterima untuk waybill/order_id yang tidak dikenal: ${waybill_id} / ${biteshipOrderId}`,
       );
       return;
    }

    // Tentukan status baru
    let newStatus: OrderStatus | null = null;
    switch (status) {
      case 'allocated': // Kurir sudah ditugaskan
      case 'picking_up': // Kurir sedang menuju lokasi pickup
      case 'picked': // Barang sudah di pickup
        newStatus = OrderStatus.SHIPPED; // Anggap SHIPPED saat sudah ada progres pickup
        break;
      case 'dropping_off': // Kurir menuju destinasi
      case 'delivered':
        newStatus = OrderStatus.DELIVERED;
        break;
      case 'rejected': // Ditolak oleh kurir
      case 'courier_not_found':
      case 'returned': // Dikembalikan ke pengirim
      case 'cancelled': // Dibatalkan (misal oleh Biteship/user)
        newStatus = OrderStatus.CANCELLED; // Atau status lain yang sesuai
        break;
       // Abaikan status lain seperti 'pending_pickup', 'on_hold', dll
       // Atau map ke status yang ada jika perlu
       default:
          this.logger.log(`Ignoring Biteship status update '${status}' for waybill ${waybill_id}`);
          break;
    }

    // Update jika status baru valid dan berbeda dari status order saat ini
    if (newStatus) {
      try {
           const currentOrder = await this.prisma.order.findUnique({ where: { id: shipment.orderId } });
           if (!currentOrder) {
                this.logger.error(`Order with ID ${shipment.orderId} not found for shipment ${shipment.id}`);
                return; // Keluar jika order tidak ditemukan
           }

           // --- BLOK PERBAIKAN TYPESCRIPT ERROR ---
           // Fungsi helper untuk menentukan 'urutan' status normal
           const getStatusOrderValue = (status: OrderStatus): number => {
                switch (status) {
                    case OrderStatus.PENDING: return 0;
                    case OrderStatus.PAID: return 1;
                    case OrderStatus.PROCESSING: return 2;
                    case OrderStatus.SHIPPED: return 3;
                    case OrderStatus.DELIVERED: return 4;
                    case OrderStatus.COMPLETED: return 5;
                    default: return -1; // Untuk CANCELLED, REFUNDED, dll.
                }
           };

           const currentOrderValue = getStatusOrderValue(currentOrder.status);
           const newOrderValue = getStatusOrderValue(newStatus);

           // Array untuk status terminal
           const terminalStatuses: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUNDED];

           // Kondisi baru: Update jika status baru lebih maju ATAU jika status baru adalah CANCELLED/REFUNDED
           // DAN status saat ini BUKAN CANCELLED/REFUNDED (kecuali jika status baru juga CANCELLED/REFUNDED)
           const shouldUpdate =
                // 1. Status baru adalah CANCELLED atau REFUNDED
                (terminalStatuses.includes(newStatus)) ||
                // 2. Status baru lebih maju DAN status saat ini bukan terminal (CANCELLED/REFUNDED)
                (newOrderValue > currentOrderValue && currentOrderValue !== -1 && !terminalStatuses.includes(currentOrder.status));

           if (shouldUpdate && currentOrder.status !== newStatus) {
                 await this.prisma.order.update({
                      where: { id: shipment.orderId },
                      data: { status: newStatus },
                 });
                 this.logger.log(
                      `Status Order ID ${shipment.orderId} diubah menjadi ${newStatus} via webhook Biteship (Waybill: ${waybill_id}).`,
                 );
           } else if (currentOrder.status === newStatus) {
                 this.logger.log(`Order ${shipment.orderId} already has status ${newStatus}. Ignoring webhook Biteship.`);
           } else {
                 this.logger.log(
                      `Ignoring Biteship status update from ${currentOrder.status} to ${newStatus} for waybill ${waybill_id} based on update logic.`,
                 );
           }
            // --- AKHIR BLOK PERBAIKAN ---

      } catch (error) {
        this.logger.error(
          `Gagal memproses webhook Biteship untuk waybill_id: ${waybill_id}`,
          error.stack,
        );
      }
    }
  } // Akhir handleBiteshipTrackingUpdate

} // Akhir class WebhooksService