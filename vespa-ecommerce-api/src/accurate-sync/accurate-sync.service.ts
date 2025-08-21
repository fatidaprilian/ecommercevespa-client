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

// Fungsi helper untuk memberikan jeda
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class AccurateSyncService {
    private readonly logger = new Logger(AccurateSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly accurateService: AccurateService,
        @InjectQueue('accurate-sync-queue') private readonly syncQueue: Queue,
    ) {}

    // ... (scheduleProductSync dan syncProductsFromAccurate tidak ada perubahan)
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

    /**
     * ALUR 2: Membuat Faktur Penjualan dan Penerimaan Pembayaran.
     */
    async createSalesInvoiceAndReceipt(orderId: string, accurateBankNo: string, accurateBankName: string) {
        this.logger.log(`Starting sales process for Order ID: ${orderId} -> Bank: ${accurateBankName} (No. Akun: ${accurateBankNo})`);
        
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { items: { include: { product: true } }, user: true },
        });
    
        if (!order) { throw new Error(`Order with ID ${orderId} not found.`); }
    
        try {
          const dbInfo = await this.prisma.accurateOAuth.findFirst();
          if (!dbInfo || !dbInfo.branchName) { throw new InternalServerErrorException('Nama cabang tidak ditemukan di konfigurasi Accurate.'); }

          const customerName = order.user.name || order.user.email;
          await this.findOrCreateCustomer(order.user.email, customerName);
    
          const detailItem = order.items.map(item => ({ itemNo: item.product.sku, quantity: item.quantity, unitPrice: item.price }));
    
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

            // ✅ PERBAIKAN FINAL: Gunakan mekanisme coba lagi (retry)
            await this.createSalesReceiptWithRetry(invoiceNumber, order.user.email, new Date(order.createdAt), totalAmount, dbInfo.branchName, accurateBankNo, accurateBankName);

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
     * ✅ FUNGSI BARU: Wrapper dengan logika coba lagi (retry).
     */
    private async createSalesReceiptWithRetry(invoiceNumber: string, customerNo: string, paymentDate: Date, amount: number, branchName: string, accurateBankNo: string, accurateBankName: string) {
        const maxRetries = 5;
        let attempt = 1;

        while (attempt <= maxRetries) {
            try {
                this.logger.log(`Attempt ${attempt}/${maxRetries} to create Sales Receipt for Invoice: ${invoiceNumber}`);
                await this.createSalesReceipt(invoiceNumber, customerNo, paymentDate, amount, branchName, accurateBankNo, accurateBankName);
                // Jika berhasil, keluar dari loop
                return; 
            } catch (error) {
                const errorMessage = error.response?.data?.d?.[0] || error.message || '';
                // Hanya coba lagi jika error spesifik ini yang muncul
                if (errorMessage.includes('tidak ditemukan atau sudah dihapus') && attempt < maxRetries) {
                    const waitTime = attempt * 2000; // Coba lagi setelah 2, 4 detik
                    this.logger.warn(`Invoice not found, retrying in ${waitTime / 1000} seconds...`);
                    await delay(waitTime);
                    attempt++;
                } else {
                    // Jika error lain atau sudah mencapai batas, lempar error dan berhenti
                    this.logger.error(`Failed to create Sales Receipt for Invoice ${invoiceNumber} after ${attempt} attempts. Reason: ${errorMessage}`);
                    // Tidak perlu melempar error ke atas lagi, cukup log karena ini proses background
                    return; 
                }
            }
        }
    }

    /**
     * Fungsi untuk membuat Penerimaan Penjualan (Sales Receipt).
     * Sekarang bisa melempar error agar ditangkap oleh wrapper retry.
     */
    private async createSalesReceipt(invoiceNumber: string, customerNo: string, paymentDate: Date, amount: number, branchName: string, accurateBankNo: string, accurateBankName: string) {
        this.logger.log(`Creating Sales Receipt for Invoice: ${invoiceNumber} into Bank: ${accurateBankName} using Bank No: ${accurateBankNo}`);
        try {
            const payload = {
                bankNo: accurateBankNo,
                transDate: formatDateToAccurate(paymentDate),
                customerNo: customerNo,
                branchName: branchName,
                'detailInvoice[0].invoiceNumber': invoiceNumber,
                'detailInvoice[0].paymentAmount': amount,
            };

            const apiClient = await this.accurateService.getAccurateApiClient();
            const response = await apiClient.post('/accurate/api/sales-receipt/save.do', payload);
            
            if (response.data && response.data.s === true) {
                this.logger.log(`✅✅✅ BERHASIL! Sales Receipt: ${response.data.r?.number} dibuat untuk Invoice: ${invoiceNumber}.`);
            } else {
                // Jika Accurate mengembalikan error dalam response yang sukses
                throw new Error(response.data.d?.[0] || 'Unknown error while creating sales receipt.');
            }
        } catch (error) {
            // Melempar error agar bisa ditangkap oleh fungsi retry
            throw error;
        }
    }
    
    /**
     * Fungsi helper untuk mencari customer, jika tidak ada, buat baru.
     */
    private async findOrCreateCustomer(email: string, name: string) {
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            const searchResponse = await apiClient.get('/accurate/api/customer/list.do', { params: { fields: 'id, name', 'sp.fn.no': email } });
            if (searchResponse.data.d && searchResponse.data.d.length > 0) {
                this.logger.log(`Customer with email ${email} already exists.`);
                return searchResponse.data.d[0];
            }
            this.logger.log(`Customer with email ${email} not found. Creating new customer...`);
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', { name: name, customerNo: email, email: email });
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