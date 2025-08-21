// Lokasi: src/accurate-sync/accurate-sync.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';

const formatDateToAccurate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class AccurateSyncService {
    private readonly logger = new Logger(AccurateSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accurateService: AccurateService,
        @InjectQueue('accurate-sync-queue') private readonly syncQueue: Queue,
    ) {}

    // ... (Fungsi syncProductsFromAccurate tidak berubah)
    @Cron(CronExpression.EVERY_30_SECONDS)
    async scheduleProductSync() {
        this.logger.log('CRON JOB: Adding "sync-products" job to the queue.');
        await this.syncQueue.add('sync-products', {}, { removeOnComplete: true, removeOnFail: 10 });
    }

    async syncProductsFromAccurate() {
        this.logger.log('WORKER: Starting product synchronization from Accurate...');
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            const response = await apiClient.get('/accurate/api/item/list.do', { params: { fields: 'no,name,itemType,unitPrice,quantity' } });
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
                    update: { name: item.name, price: item.unitPrice, stock: item.quantity },
                    create: { sku: item.no, name: item.name, price: item.unitPrice, stock: item.quantity, weight: 1000 },
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
    
    // =======================================================
    // ALUR UTAMA: REVISI DENGAN LOGIKA ONGKIR & PPN
    // =======================================================
    async createSalesInvoiceAndReceipt(orderId: string, accurateBankNo: string, accurateBankName: string) {
        this.logger.log(`Memulai proses penjualan untuk Order ID: ${orderId} -> Bank: ${accurateBankName} (No. Akun: ${accurateBankNo})`);
        
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } }, user: true, payment: true },
        });
    
        if (!order || !order.payment) {
            throw new Error(`Order atau data pembayaran untuk ID ${orderId} tidak ditemukan.`);
        }
    
        try {
            const dbInfo = await this.prisma.accurateOAuth.findFirst();
            if (!dbInfo || !dbInfo.branchName) {
                throw new InternalServerErrorException('Nama cabang tidak ditemukan di konfigurasi Accurate.');
            }

            const customerName = order.user.name || order.user.email;
            await this.findOrCreateCustomer(order.user.email, customerName);
    
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            // 1. Siapkan detail item produk. Harganya adalah harga bersih sebelum PPN.
            const detailItem = order.items.map(item => ({
                itemNo: item.product.sku,
                quantity: item.quantity,
                unitPrice: item.price, // Ini adalah harga subtotal per item
            }));

            // 2. Tambahkan ongkos kirim sebagai item jasa terpisah
            if (order.shippingCost > 0) {
                detailItem.push({
                    itemNo: 'SHIPPING', // Pastikan item 'SHIPPING' ada di Accurate
                    quantity: 1,
                    unitPrice: order.shippingCost,
                });
            }
            
            const invoicePayload = {
                customerNo: order.user.email,
                transDate: formatDateToAccurate(new Date(order.createdAt)), 
                detailItem: detailItem,
                branchName: dbInfo.branchName,
            };
            
            const invoiceResponse = await apiClient.post('/accurate/api/sales-invoice/save.do', invoicePayload);
            
            if (!invoiceResponse.data?.s || !invoiceResponse.data?.r?.id) {
                const errorMessage = invoiceResponse.data?.d?.[0] || 'Gagal membuat Sales Invoice di Accurate.';
                throw new Error(errorMessage);
            }

            const invoiceId = invoiceResponse.data.r.id as number;
            const invoiceNumber = invoiceResponse.data.r.number as string;
            // 3. Ambil total final dari Accurate (yang sudah termasuk PPN)
            const accurateTotalAmount = invoiceResponse.data.r.totalAmount as number;

            this.logger.log(`Berhasil membuat Sales Invoice: ${invoiceNumber} (ID: ${invoiceId}) dengan Total Accurate: Rp ${accurateTotalAmount}`);
            
            await this.prisma.order.update({
                where: { id: orderId },
                data: { accurateSalesInvoiceId: invoiceId, accurateSalesInvoiceNumber: invoiceNumber },
            });
            
            this.logger.log('Memberi jeda 2 detik sebelum membuat pelunasan...');
            await delay(2000);

            const receiptPayload = {
                bankNo: accurateBankNo,
                transDate: formatDateToAccurate(new Date(order.payment.createdAt)),
                customerNo: order.user.email,
                branchName: dbInfo.branchName,
                detailInvoice: [{
                    invoiceNo: invoiceNumber,
                    // 4. Gunakan total dari Accurate sebagai nilai pembayaran
                    paymentAmount: accurateTotalAmount,
                }],
            };
            
            this.logger.log(`Membuat Pelunasan Penjualan sebesar Rp ${accurateTotalAmount} untuk Invoice ${invoiceNumber}`);
            const receiptResponse = await apiClient.post('/accurate/api/sales-receipt/save.do', receiptPayload);

            if (!receiptResponse.data?.s) {
                throw new Error(receiptResponse.data?.d?.[0] || 'Gagal saat menyimpan Sales Receipt.');
            }
            
            this.logger.log(`✅ BERHASIL: Sales Receipt ${receiptResponse.data.r.number} dibuat untuk Invoice ${invoiceNumber}.`);
            return receiptResponse.data.r;

        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`[GAGAL TOTAL] Proses untuk Order ID: ${orderId} dihentikan. Alasan: ${errorMessage}`, error.stack);
            throw new Error(`Gagal memproses penjualan di Accurate: ${errorMessage}`);
        }
    }
    
    // ... (Fungsi findOrCreateCustomer tidak perlu diubah)
    private async findOrCreateCustomer(email: string, name: string) {
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            const searchResponse = await apiClient.get('/accurate/api/customer/list.do', { params: { fields: 'id, name', 'sp.fn.no': email } });
            
            if (searchResponse.data.d && searchResponse.data.d.length > 0) {
                this.logger.log(`Pelanggan dengan email ${email} sudah ada.`);
                return searchResponse.data.d[0];
            }

            this.logger.log(`Pelanggan dengan email ${email} tidak ditemukan. Membuat baru...`);
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', { name: name, customerNo: email, email: email });
            
            if (createResponse.data?.s) {
                this.logger.log(`Berhasil membuat pelanggan baru dengan ID: ${createResponse.data.r.id}`);
                return createResponse.data.r;
            } else {
                throw new Error(createResponse.data?.d?.[0] || 'Gagal membuat pelanggan.');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`Error mencari/membuat pelanggan ${email}. Alasan: ${errorMessage}`);
            throw new Error(`Gagal mencari atau membuat pelanggan di Accurate.`);
        }
    }
}