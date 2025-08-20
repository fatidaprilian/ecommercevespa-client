import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';
import { User } from '@prisma/client';

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
    @Cron(CronExpression.EVERY_30_SECONDS) // Tetap 30 detik untuk testing, bisa diubah nanti
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
            
            // Menggunakan path API yang benar sesuai dokumentasi
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
                // --- FILTER DIKTIFKAN KEMBALI ---
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
                        weight: 1000, // Default weight
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
     * ALUR 2: Membuat Faktur Penjualan (E-commerce -> Accurate)
     */
    async createSalesInvoice(orderId: string) {
        this.logger.log(`Creating Sales Invoice in Accurate for Order ID: ${orderId}`);
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: { items: { include: { product: true } }, user: true },
            });

            if (!order) {
                throw new Error(`Order with ID ${orderId} not found.`);
            }

            const customerName = order.user.name || order.user.email;
            await this.findOrCreateCustomer(order.user.email, customerName);

            const detailItem = order.items.map(item => ({
                itemNo: item.product.sku,
                quantity: item.quantity,
                unitPrice: item.price,
            }));

            const payload = {
                customerNo: order.user.email,
                transDate: new Date().toISOString().split('T')[0],
                detailItem: detailItem,
            };

            const apiClient = await this.accurateService.getAccurateApiClient();
            const response = await apiClient.post('/accurate/api/sales-invoice/save.do', payload);
            
            this.logger.log(`Successfully created Sales Invoice for Order ID: ${orderId}. Accurate Invoice No: ${response.data.d.number}`);
            return response.data.d;

        } catch (error) {
            this.logger.error(`Failed to create Sales Invoice for Order ID: ${orderId}`, error.response?.data || error.message);
            throw new Error('Gagal membuat faktur penjualan di Accurate.');
        }
    }
    
    /**
     * Fungsi helper untuk mencari customer, jika tidak ada, buat baru.
     */
    private async findOrCreateCustomer(email: string, name: string) {
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            const searchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                params: { fields: 'id, name', 'filter.no': email }
            });

            if (searchResponse.data.d && searchResponse.data.d.length > 0) {
                this.logger.log(`Customer with email ${email} already exists.`);
                return searchResponse.data.d[0];
            }

            this.logger.log(`Customer with email ${email} not found. Creating new customer...`);
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', {
                name: name,
                customerNo: email, // Menggunakan email sebagai nomor pelanggan unik
                email: email
            });

            this.logger.log(`Successfully created new customer with ID: ${createResponse.data.r.id}`);
            return createResponse.data.r;

        } catch (error) {
            this.logger.error(`Error finding or creating customer ${email}`, error.response?.data || error.message);
            throw new Error(`Gagal mencari atau membuat pelanggan di Accurate.`);
        }
    }
}