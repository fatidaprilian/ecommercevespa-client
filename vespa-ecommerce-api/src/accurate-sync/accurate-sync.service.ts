// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';
import { User } from '@prisma/client';

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

            const accurateCustomer = await this.findOrCreateCustomer(order.user);
            if (!accurateCustomer || !accurateCustomer.customerNo) {
                throw new InternalServerErrorException(`Failed to retrieve a valid customer object from Accurate for user ID: ${order.user.id}`);
            }
    
            const apiClient = await this.accurateService.getAccurateApiClient();
            
            const detailItem = order.items.map(item => ({
                itemNo: item.product.sku,
                quantity: item.quantity,
                unitPrice: item.price,
            }));

            if (order.shippingCost > 0) {
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
            };
            
            const invoiceResponse = await apiClient.post('/accurate/api/sales-invoice/save.do', invoicePayload);
            
            if (!invoiceResponse.data?.s || !invoiceResponse.data?.r?.id) {
                throw new Error(invoiceResponse.data?.d?.[0] || 'Failed to create Sales Invoice in Accurate.');
            }

            const invoiceId = invoiceResponse.data.r.id as number;
            const invoiceNumber = invoiceResponse.data.r.number as string;
            const accurateTotalAmount = invoiceResponse.data.r.totalAmount as number;

            this.logger.log(`Successfully created Sales Invoice: ${invoiceNumber} (ID: ${invoiceId}) with Accurate Total: Rp ${accurateTotalAmount}`);
            
            await this.prisma.order.update({
                where: { id: orderId },
                data: { accurateSalesInvoiceId: invoiceId, accurateSalesInvoiceNumber: invoiceNumber },
            });
            
            await delay(2000);

            const receiptPayload = {
                bankNo: accurateBankNo,
                transDate: formatDateToAccurate(new Date(order.payment.createdAt)),
                customerNo: accurateCustomer.customerNo,
                branchName: dbInfo.branchName,
                chequeAmount: accurateTotalAmount,
                detailInvoice: [{
                    invoiceNo: invoiceNumber,
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
    
    private async findOrCreateCustomer(user: User): Promise<any> {
        const apiClient = await this.accurateService.getAccurateApiClient();

        if (user.accurateCustomerNo) {
            this.logger.log(`Local record found for user ${user.email}. Searching Accurate with customerNo: ${user.accurateCustomerNo}`);
            try {
                const searchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                    params: {
                        fields: 'id,name,customerNo',
                        'sp.filter.customerNo': `EQUAL(${user.accurateCustomerNo})`
                    }
                });

                if (searchResponse.data?.d?.[0]) {
                    this.logger.log(`Successfully fetched existing customer from Accurate.`);
                    return searchResponse.data.d[0];
                }
            } catch (error) {
                this.logger.error(`Failed to fetch existing customer ${user.accurateCustomerNo}. Will attempt to create a new one.`, error.response?.data);
            }
        }

        const newCustomerNo = `ECOMM-${user.id}`;
        this.logger.log(`No local record for ${user.email}. Attempting to create new customer in Accurate with customerNo: ${newCustomerNo}`);
        
        try {
            const customerName = user.name || user.email;
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', { 
                name: customerName, 
                customerNo: newCustomerNo, 
                email: user.email 
            });

            if (createResponse.data?.s) {
                const newAccurateCustomer = createResponse.data.r;
                this.logger.log(`Successfully created new customer in Accurate with ID: ${newAccurateCustomer.id}`);
                
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { accurateCustomerNo: newCustomerNo },
                });
                
                return newAccurateCustomer;
            } else {
                 const errorMessage = createResponse.data?.d?.[0] || 'Failed to create customer.';
                 this.logger.error(`Accurate API error on customer creation: ${errorMessage}`);
                 throw new Error(errorMessage);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`Error creating customer ${newCustomerNo}: ${errorMessage}`);
            throw new Error(`Failed to create customer in Accurate.`);
        }
    }
}