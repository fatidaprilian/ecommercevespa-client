import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';
import { Order, OrderItem, Product } from '@prisma/client';

@Injectable()
export class AccurateSyncService {
    private readonly logger = new Logger(AccurateSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accurateService: AccurateService,
        @InjectQueue('accurate-sync-queue') private readonly syncQueue: Queue, // Inject antrean BullMQ
    ) {}

    /**
     * CRON JOB (PRODUSER)
     * Tugasnya hanya menambahkan job ke antrean setiap 30 detik untuk testing.
     * Ini membuat API Anda tetap responsif.
     */
    @Cron(CronExpression.EVERY_30_SECONDS)
    async scheduleProductSync() {
        this.logger.log('CRON JOB: Adding "sync-products" job to the queue.');
        await this.syncQueue.add(
            'sync-products', // Nama pekerjaan yang akan dikenali oleh processor
            {}, // Data tambahan (payload) jika diperlukan
            {
                removeOnComplete: true, // Hapus job setelah selesai agar antrean bersih
                removeOnFail: 10,       // Hapus job setelah 10 kali gagal
            }
        );
    }

    /**
     * ALUR 1: LOGIKA SINKRONISASI PRODUK (WORKER LOGIC)
     * Fungsi ini sekarang dipanggil oleh 'AccurateSyncProcessor', bukan langsung oleh Cron.
     * Logikanya tidak berubah sama sekali.
     */
    async syncProductsFromAccurate() {
        this.logger.log('WORKER: Starting product synchronization from Accurate...');
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            const response = await apiClient.get('/api/item/list.do', {
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

            this.logger.log(`WORKER: Successfully synced ${syncedCount} products.`);
            return { syncedCount, message: `Berhasil menyinkronkan ${syncedCount} produk.` };

        } catch (error) {
            this.logger.error('WORKER: Failed to sync products from Accurate', error.response?.data || error.message);
            throw new Error('Gagal menyinkronkan produk dari Accurate.');
        }
    }

    /**
     * ALUR 2: Membuat Faktur Penjualan (E-commerce -> Accurate)
     * Logika fungsi ini tidak berubah.
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
            const response = await apiClient.post('/api/sales-invoice/save.do', payload);
            
            this.logger.log(`Successfully created Sales Invoice for Order ID: ${orderId}. Accurate Invoice No: ${response.data.d.number}`);
            return response.data.d;

        } catch (error) {
            this.logger.error(`Failed to create Sales Invoice for Order ID: ${orderId}`, error.response?.data || error.message);
            throw new Error('Gagal membuat faktur penjualan di Accurate.');
        }
    }
}