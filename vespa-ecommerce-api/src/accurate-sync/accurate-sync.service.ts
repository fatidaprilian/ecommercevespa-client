// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service'; // Service OAuth kita
import { Order, OrderItem, Product } from '@prisma/client';

@Injectable()
export class AccurateSyncService {
    private readonly logger = new Logger(AccurateSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accurateService: AccurateService,
    ) {}

    /**
     * ALUR 1: Sinkronisasi Produk & Stok (Accurate -> E-commerce)
     * Mengambil semua item dari Accurate dan melakukan update/insert (upsert) ke database lokal.
     */
    async syncProductsFromAccurate() {
        this.logger.log('Starting product synchronization from Accurate...');
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            // Mengambil daftar item dari Accurate. Sesuaikan 'fields' jika butuh data lain.
            const response = await apiClient.get('/api/item/list.do', {
                params: {
                    fields: 'no,name,itemType,unitPrice,quantity',
                },
            });

            const itemsFromAccurate = response.data.d; // 'd' adalah array data dari Accurate
            if (!itemsFromAccurate || itemsFromAccurate.length === 0) {
                this.logger.warn('No items found in Accurate to sync.');
                return { syncedCount: 0, message: 'Tidak ada produk yang ditemukan di Accurate.' };
            }

            let syncedCount = 0;
            for (const item of itemsFromAccurate) {
                // Kita hanya peduli dengan item bertipe 'INVENTORY'
                if (item.itemType !== 'INVENTORY') continue;

                await this.prisma.product.upsert({
                    where: { sku: item.no }, // 'no' di Accurate adalah SKU kita
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
                        weight: 1000, // Beri nilai default
                    },
                });
                syncedCount++;
            }

            this.logger.log(`Successfully synced ${syncedCount} products.`);
            return { syncedCount, message: `Berhasil menyinkronkan ${syncedCount} produk.` };

        } catch (error) {
            this.logger.error('Failed to sync products from Accurate', error.response?.data || error.message);
            throw new Error('Gagal menyinkronkan produk dari Accurate.');
        }
    }

    /**
     * ALUR 2: Membuat Faktur Penjualan (E-commerce -> Accurate)
     * Mengirim data order yang sudah lunas ke Accurate untuk dibuatkan Sales Invoice.
     * @param orderId ID Order dari database lokal kita
     */
    async createSalesInvoice(orderId: string) {
        this.logger.log(`Creating Sales Invoice in Accurate for Order ID: ${orderId}`);
        try {
            // 1. Ambil data order lengkap dari database kita
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: { items: { include: { product: true } }, user: true },
            });

            if (!order) {
                throw new Error(`Order with ID ${orderId} not found.`);
            }

            // 2. Siapkan data detail item sesuai format Accurate
            const detailItem = order.items.map(item => ({
                itemNo: item.product.sku, // Cocokkan dengan SKU
                quantity: item.quantity,
                unitPrice: item.price,
            }));

            // 3. Siapkan payload (data lengkap) untuk dikirim ke Accurate
            const payload = {
                customerNo: order.user.email, // Asumsi customer di Accurate diidentifikasi via email
                transDate: new Date().toISOString().split('T')[0], // Tanggal hari ini format YYYY-MM-DD
                detailItem: detailItem,
                // Tambahkan field lain yang dibutuhkan seperti nomor PO, dll.
            };

            // 4. Kirim data ke API Accurate
            const apiClient = await this.accurateService.getAccurateApiClient();
            const response = await apiClient.post('/api/sales-invoice/save.do', payload);
            
            this.logger.log(`Successfully created Sales Invoice for Order ID: ${orderId}. Accurate Invoice No: ${response.data.d.number}`);
            return response.data.d;

        } catch (error) {
            this.logger.error(`Failed to create Sales Invoice for Order ID: ${orderId}`, error.response?.data || error.message);
            // Tambahkan logic untuk menandai order ini gagal sinkron agar bisa dicoba lagi
            throw new Error('Gagal membuat faktur penjualan di Accurate.');
        }
    }
}