// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.service.ts

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
     * Creates a Sales Invoice and immediately pays it off with a Sales Receipt.
     * This is the core function for syncing manual reseller payments.
     */
    async createSalesInvoiceAndReceipt(orderId: string, accurateBankNo: string, accurateBankName: string) {
        this.logger.log(`Starting sales process for Order ID: ${orderId} -> Bank: ${accurateBankName} (Account No: ${accurateBankNo})`);
        
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } }, user: true, payment: true },
        });
    
        if (!order || !order.payment) {
            throw new Error(`Order or payment data for ID ${orderId} not found.`);
        }
    
        try {
            const dbInfo = await this.prisma.accurateOAuth.findFirst();
            if (!dbInfo || !dbInfo.branchName) {
                throw new InternalServerErrorException('Branch name not found in Accurate configuration.');
            }

            const customerName = order.user.name || order.user.email;
            await this.findOrCreateCustomer(order.user.email, customerName);
    
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            // Prepare invoice items from order data.
            const detailItem = order.items.map(item => ({
                itemNo: item.product.sku,
                quantity: item.quantity,
                unitPrice: item.price, // This price is already the final discounted price.
            }));

            // Add shipping cost as a separate line item if it exists.
            if (order.shippingCost > 0) {
                detailItem.push({
                    itemNo: 'SHIPPING', // Ensure an item with SKU 'SHIPPING' exists in Accurate.
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
            
            // Send request to create the Sales Invoice.
            const invoiceResponse = await apiClient.post('/accurate/api/sales-invoice/save.do', invoicePayload);
            
            if (!invoiceResponse.data?.s || !invoiceResponse.data?.r?.id) {
                throw new Error(invoiceResponse.data?.d?.[0] || 'Failed to create Sales Invoice in Accurate.');
            }

            const invoiceId = invoiceResponse.data.r.id as number;
            const invoiceNumber = invoiceResponse.data.r.number as string;
            // Use the total from Accurate's response, as it includes Accurate-calculated tax.
            const accurateTotalAmount = invoiceResponse.data.r.totalAmount as number;

            this.logger.log(`Successfully created Sales Invoice: ${invoiceNumber} (ID: ${invoiceId}) with Accurate Total: Rp ${accurateTotalAmount}`);
            
            await this.prisma.order.update({
                where: { id: orderId },
                data: { accurateSalesInvoiceId: invoiceId, accurateSalesInvoiceNumber: invoiceNumber },
            });
            
            await delay(2000); // Allow time for Accurate's system to process the invoice.

            // Prepare payload to create the Sales Receipt (Payment).
            const receiptPayload = {
                bankNo: accurateBankNo,
                transDate: formatDateToAccurate(new Date(order.payment.createdAt)),
                customerNo: order.user.email,
                branchName: dbInfo.branchName,
                chequeAmount: accurateTotalAmount, // Payment amount must exactly match the invoice total.
                detailInvoice: [{
                    invoiceNo: invoiceNumber, // Use the number of the newly created invoice.
                    paymentAmount: accurateTotalAmount,
                }],
            };
            
            this.logger.log(`Creating Sales Receipt for Rp ${accurateTotalAmount} for Invoice ${invoiceNumber}`);
            const receiptResponse = await apiClient.post('/accurate/api/sales-receipt/save.do', receiptPayload);

            if (!receiptResponse.data?.s) {
                throw new Error(receiptResponse.data?.d?.[0] || 'Failed while saving Sales Receipt.');
            }
            
            this.logger.log(`✅✅✅ SUCCESS: Sales Receipt ${receiptResponse.data.r.number} created.`);
            return receiptResponse.data.r;

        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`[FATAL] Process for Order ID: ${orderId} stopped. Reason: ${errorMessage}`, error.stack);
            throw new Error(`Failed to process sale in Accurate: ${errorMessage}`);
        }
    }
    
    private async findOrCreateCustomer(email: string, name: string) {
        try {
            const apiClient = await this.accurateService.getAccurateApiClient();
            const searchResponse = await apiClient.get('/accurate/api/customer/list.do', { params: { fields: 'id, name', 'sp.fn.no': email } });
            
            if (searchResponse.data.d && searchResponse.data.d.length > 0) {
                this.logger.log(`Customer with email ${email} already exists.`);
                return searchResponse.data.d[0];
            }

            this.logger.log(`Customer with email ${email} not found. Creating new...`);
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', { name: name, customerNo: email, email: email });
            
            if (createResponse.data?.s) {
                this.logger.log(`Successfully created new customer with ID: ${createResponse.data.r.id}`);
                return createResponse.data.r;
            } else {
                throw new Error(createResponse.data?.d?.[0] || 'Failed to create customer.');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`Error finding/creating customer ${email}. Reason: ${errorMessage}`);
            throw new Error(`Failed to find or create customer in Accurate.`);
        }
    }
}