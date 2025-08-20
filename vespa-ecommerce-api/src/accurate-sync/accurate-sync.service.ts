// src/accurate-sync/accurate-sync.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';

// Fungsi helper kecil untuk memformat tanggal ke DD/MM/YYYY
const formatDateToAccurate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// ✅ FUNGSI KUNCI: Membersihkan string untuk dicocokkan dengan Accurate
const cleanAccurateString = (str: string): string => {
    // Menghilangkan spasi ganda dan karakter whitespace lainnya (seperti tab, newline)
    // lalu melakukan trim spasi di awal/akhir.
    return str.replace(/\s+/g, ' ').trim();
};


@Injectable()
export class AccurateSyncService {
    private readonly logger = new Logger(AccurateSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accurateService: AccurateService,
        @InjectQueue('accurate-sync-queue') private readonly syncQueue: Queue,
    ) {}

    /**
     * CRON JOB (PRODUSER)
     * Menambahkan job sinkronisasi produk ke antrean secara terjadwal.
     */
    @Cron(CronExpression.EVERY_30_SECONDS)
    async scheduleProductSync() {
        this.logger.log('CRON JOB: Adding "sync-products" job to the queue.');
        await this.syncQueue.add(
            'sync-products',
            {},
            {
                removeOnComplete: true,
                removeOnFail: 10,
            }
        );
    }

    /**
     * ALUR 1: LOGIKA SINKRONISASI PRODUK (WORKER LOGIC)
     * Logika utama yang dijalankan oleh processor.
     */
    async syncProductsFromAccurate() {
        this.logger.log('WORKER: Starting product synchronization from Accurate...');
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            const response = await apiClient.get('/accurate/api/item/list.do', {
                params: {
                    fields: 'no,name,itemType,unitPrice,quantity',
                },
            });

            const itemsFromAccurate = response.data.d;
            if (!itemsFromAccurate || itemsFromAccurate.length === 0) {
                this.logger.warn('WORKER: No items found in Accurate to sync.');
                return { syncedCount: 0, message: 'Tidak ada produk yang ditemukan di Accurate.' };
            }

            let syncedCount = 0;
            for (const item of itemsFromAccurate) {
                if (item.itemType !== 'INVENTORY') continue;

                await this.prisma.product.upsert({
                    where: { sku: item.no },
                    update: {
                        name: item.name,
                        price: item.unitPrice,
                        stock: item.quantity,
                    },
                    create: {
                        sku: item.no,
                        name: item.name,
                        price: item.unitPrice,
                        stock: item.quantity,
                        weight: 1000,
                    },
                });
                syncedCount++;
            }

            this.logger.log(`WORKER: Successfully synced ${syncedCount} products of type INVENTORY.`);
            return { syncedCount, message: `Berhasil menyinkronkan ${syncedCount} produk.` };

        } catch (error) {
            this.logger.error('WORKER: Failed to sync products from Accurate', error.response?.data || error.message);
            throw new Error('Gagal menyinkronkan produk dari Accurate.');
        }
    }

    /**
     * ALUR 2: Membuat Faktur Penjualan dan Penerimaan Pembayaran secara dinamis.
     */
    async createSalesInvoiceAndReceipt(orderId: string, accurateBankName: string) {
        this.logger.log(`Starting sales process for Order ID: ${orderId} -> Bank: ${accurateBankName}`);
        
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, user: true },
        });
    
        if (!order) {
          throw new Error(`Order with ID ${orderId} not found.`);
        }
    
        try {
          const dbInfo = await this.prisma.accurateOAuth.findFirst();
          if (!dbInfo || !dbInfo.branchName) {
              throw new InternalServerErrorException('Nama cabang tidak ditemukan di konfigurasi Accurate.');
          }

          const customerName = order.user.name || order.user.email;
          await this.findOrCreateCustomer(order.user.email, customerName);
    
          const detailItem = order.items.map(item => ({
            itemNo: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.price,
          }));
    
          const invoicePayload = {
            customerNo: order.user.email,
            transDate: formatDateToAccurate(new Date(order.createdAt)), 
            detailItem: detailItem,
            branchName: dbInfo.branchName,
          };
    
          const apiClient = await this.accurateService.getAccurateApiClient();
          const invoiceResponse = await apiClient.post('/accurate/api/sales-invoice/save.do', invoicePayload);
          
          if (invoiceResponse.data && invoiceResponse.data.s === true) {
            const invoiceNumber = invoiceResponse.data.r?.number;
            const totalAmount = invoiceResponse.data.r?.totalAmount;
            this.logger.log(`Successfully created Sales Invoice: ${invoiceNumber}`);

            // Teruskan nama bank yang diterima ke fungsi createSalesReceipt
            await this.createSalesReceipt(invoiceNumber, order.user.email, new Date(order.createdAt), totalAmount, dbInfo.branchName, accurateBankName);

            return invoiceResponse.data.r;
          } else {
            const errorMessage = invoiceResponse.data.d?.[0] || 'Unknown error from Accurate while creating invoice.';
            throw new Error(errorMessage);
          }
    
        } catch (error) {
          const errorMessage = error.response?.data?.d?.[0] || error.message;
          this.logger.error(`Failed to process sales for Order ID: ${orderId}. Reason: ${errorMessage}`, error.stack);
          throw new Error('Gagal memproses penjualan di Accurate.');
        }
    }
    
    /**
     * Fungsi untuk membuat Penerimaan Penjualan (Sales Receipt).
     */
    private async createSalesReceipt(invoiceNumber: string, customerNo: string, paymentDate: Date, amount: number, branchName: string, accurateBankName: string) {
        // ✅ PERBAIKAN UTAMA DAN FINAL DI SINI
        const cleanedBankName = cleanAccurateString(accurateBankName);
        this.logger.log(`Creating Sales Receipt for Invoice: ${invoiceNumber} into Bank: "${cleanedBankName}"`); // Log dengan kutip untuk melihat spasi

        try {
            const payload = {
                bankNo: cleanedBankName, // Menggunakan nama bank yang sudah dibersihkan
                transDate: formatDateToAccurate(paymentDate),
                customerNo: customerNo,
                branchName: branchName,
                'detailInvoice[0].invoiceNumber': invoiceNumber,
                'detailInvoice[0].paymentAmount': amount,
            };

            const apiClient = await this.accurateService.getAccurateApiClient();
            const response = await apiClient.post('/accurate/api/sales-receipt/save.do', payload);
            
            if (response.data && response.data.s === true) {
                this.logger.log(`Successfully created Sales Receipt: ${response.data.r?.number} for Invoice: ${invoiceNumber}. Invoice is now PAID.`);
            } else {
                const errorMessage = response.data.d?.[0] || 'Unknown error while creating sales receipt.';
                this.logger.error(`Could not create Sales Receipt for Invoice ${invoiceNumber}. Reason: ${errorMessage}`);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`Failed to create Sales Receipt for Invoice ${invoiceNumber}. Reason: ${errorMessage}`);
        }
    }
    
    /**
     * Fungsi helper untuk mencari customer, jika tidak ada, buat baru.
     */
    private async findOrCreateCustomer(email: string, name: string) {
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            const searchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                params: { fields: 'id, name', 'sp.fn.no': email }
            });

            if (searchResponse.data.d && searchResponse.data.d.length > 0) {
                this.logger.log(`Customer with email ${email} already exists.`);
                return searchResponse.data.d[0];
            }

            this.logger.log(`Customer with email ${email} not found. Creating new customer...`);
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', {
                name: name,
                customerNo: email,
                email: email
            });

            if (createResponse.data && createResponse.data.s === true) {
                this.logger.log(`Successfully created new customer with ID: ${createResponse.data.r.id}`);
                return createResponse.data.r;
            } else {
                const errorMessage = createResponse.data.d?.[0] || 'Failed to create customer.';
                throw new Error(errorMessage);
            }

        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`Error finding or creating customer ${email}. Reason: ${errorMessage}`);
            throw new Error(`Gagal mencari atau membuat pelanggan di Accurate.`);
        }
    }
}