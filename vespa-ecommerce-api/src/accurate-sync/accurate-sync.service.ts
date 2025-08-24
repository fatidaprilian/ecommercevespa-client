// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';
import { Order, User } from '@prisma/client';

// Type definitions for Accurate API responses
interface AccurateCustomer {
    id: number;
    name: string;
    customerNo: string;
    email?: string;
}

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
    
    /**
     * Adds a job to create a Sales Order to the queue.
     */
    async addSalesOrderJobToQueue(orderId: string) {
        this.logger.log(`Adding "create-sales-order" job for Order ID: ${orderId} to the queue.`);
        await this.syncQueue.add(
            'create-sales-order', 
            { orderId }, 
            { 
                removeOnComplete: true, 
                removeOnFail: 10,
                attempts: 3,
                backoff: { type: 'exponential', delay: 10000 }
            }
        );
    }

    /**
     * The core logic to create a "Sales Order" in Accurate.
     * 🔥 UPDATED: Sekarang cek role user - hanya reseller yang boleh langsung buat Sales Order
     */
    async processSalesOrderCreation(orderId: string) {
        this.logger.log(`WORKER: Processing Sales Order creation for Order ID: ${orderId}`);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true, items: { include: { product: true } } },
        });

        if (!order) {
            throw new Error(`Order with ID ${orderId} not found during job processing.`);
        }

        // 🔥 TAMBAHAN: Cek role user - hanya reseller yang boleh langsung buat Sales Order
        if (order.user.role !== 'RESELLER') {
            this.logger.log(`SKIPPED: Sales Order creation for Order ID: ${orderId} - User ${order.user.email} is not a RESELLER (role: ${order.user.role})`);
            return { skipped: true, reason: 'User is not a reseller' };
        }

        try {
            const dbInfo = await this.prisma.accurateOAuth.findFirst();
            if (!dbInfo || !dbInfo.branchName) {
                throw new InternalServerErrorException('Branch name not found in Accurate configuration.');
            }

            const accurateCustomer = await this.findOrCreateCustomer(order.user);
            if (!accurateCustomer || !accurateCustomer.customerNo) {
                throw new InternalServerErrorException(`Failed to get or create a valid customer in Accurate for user ID: ${order.user.id}`);
            }

            const apiClient = await this.accurateService.getAccurateApiClient();
            
            const detailItem = order.items.map(item => ({
                itemNo: item.product.sku,
                quantity: item.quantity,
                unitPrice: item.price,
            }));
            
            if (order.shippingCost > 0) {
                detailItem.push({ itemNo: 'SHIPPING', quantity: 1, unitPrice: order.shippingCost });
            }

            const salesOrderPayload = {
                customerNo: accurateCustomer.customerNo,
                transDate: formatDateToAccurate(new Date(order.createdAt)),
                detailItem: detailItem,
                branchName: dbInfo.branchName,
                number: `SO-${order.orderNumber}`
            };

            const response = await apiClient.post('/accurate/api/sales-order/save.do', salesOrderPayload);

            if (!response.data?.s) {
                const errorMessage = response.data?.d?.[0] || 'Failed to create Sales Order in Accurate.';
                throw new Error(errorMessage);
            }
            
            const salesOrderNumber = response.data.r.number as string;

            // 🔥 PERBAIKAN: Status tetap PENDING, nanti berubah saat Sales Invoice dibuat
            await this.prisma.order.update({
                where: { id: orderId },
                data: { 
                    accurateSalesOrderNumber: salesOrderNumber 
                    // status tetap PENDING sampai admin buat Sales Invoice
                },
            });

            this.logger.log(`✅✅✅ WORKER SUCCESS: Sales Order ${salesOrderNumber} created in Accurate for order ${order.orderNumber}. Status remains PENDING until invoice is created.`);
            return response.data.r;

        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`[FATAL WORKER] Sales Order creation for Order ID: ${orderId} failed. Reason: ${errorMessage}`, error.stack);
            throw new Error(`Failed to process sale in Accurate: ${errorMessage}`);
        }
    }
    
    // 👇 --- NEW CRON JOB ADDED HERE --- 👇
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async scheduleWebhookRenewal() {
        this.logger.log('CRON JOB: Triggering Accurate webhook renewal.');
        await this.accurateService.renewWebhook();
    }
    // 👆 --- END OF NEW CRON JOB --- 👆

    @Cron(CronExpression.EVERY_MINUTE)
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
     * Method untuk member yang bayar dulu - tetap sama seperti sebelumnya
     * Ini dipakai untuk alur member biasa (bukan reseller)
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
    
    private async findOrCreateCustomer(user: User): Promise<AccurateCustomer> {
        const apiClient = await this.accurateService.getAccurateApiClient();

        if (user.accurateCustomerNo) {
            this.logger.log(`Local record found for user ${user.email}. Searching Accurate with customerNo: ${user.accurateCustomerNo}`);
            try {
                let foundCustomer: AccurateCustomer | null = null;
                try {
                    const searchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                        params: {
                            fields: 'id,name,customerNo,email',
                            'filter.customerNo.op': 'EQUAL',
                            'filter.customerNo.val[0]': user.accurateCustomerNo,
                            'sp.pageSize': 100
                        }
                    });

                    if (searchResponse.data?.s && searchResponse.data?.d && searchResponse.data.d.length > 0) {
                        foundCustomer = searchResponse.data.d.find((customer: AccurateCustomer) => 
                            customer.customerNo === user.accurateCustomerNo
                        ) || null;
                        
                        if (foundCustomer) {
                            this.logger.log(`Found customer via filtered search: ${foundCustomer.customerNo} (ID: ${foundCustomer.id})`);
                        } else {
                            this.logger.warn(`Filter returned ${searchResponse.data.d.length} customers but none matched exactly: ${user.accurateCustomerNo}`);
                            searchResponse.data.d.slice(0, 3).forEach((customer: AccurateCustomer) => {
                                this.logger.warn(`  - Found: ${customer.customerNo} (${customer.name})`);
                            });
                        }
                    }
                } catch (filterError) {
                    this.logger.warn(`Filtered search failed: ${filterError.message}`);
                }

                if (!foundCustomer) {
                    this.logger.log(`Fallback to manual search for customerNo: ${user.accurateCustomerNo}`);
                    try {
                        const manualSearchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                            params: {
                                fields: 'id,name,customerNo,email',
                                'sp.pageSize': 500
                            }
                        });

                        if (manualSearchResponse.data?.s && manualSearchResponse.data?.d && manualSearchResponse.data.d.length > 0) {
                            foundCustomer = manualSearchResponse.data.d.find((customer: AccurateCustomer) => 
                                customer.customerNo === user.accurateCustomerNo
                            ) || null;
                            
                            if (foundCustomer) {
                                this.logger.log(`Found customer via manual search: ${foundCustomer.customerNo} (ID: ${foundCustomer.id})`);
                            }
                        }
                    } catch (manualError) {
                        this.logger.warn(`Manual search failed: ${manualError.message}`);
                    }
                }

                if (foundCustomer) {
                    this.logger.log(`Successfully fetched existing customer from Accurate: ${foundCustomer.customerNo} (ID: ${foundCustomer.id}, Name: ${foundCustomer.name})`);
                    
                    if (!foundCustomer.customerNo.startsWith('ECOMM-')) {
                        this.logger.error(`VALIDATION ERROR: Found customer ${foundCustomer.customerNo} but it doesn't match ECOMM format. Expected: ${user.accurateCustomerNo}`);
                        this.logger.error(`This indicates a data integrity issue. Will reset and create new customer.`);
                        
                        await this.prisma.user.update({
                            where: { id: user.id },
                            data: { accurateCustomerNo: null },
                        });
                        
                        foundCustomer = null;
                    }
                    
                    if (foundCustomer && foundCustomer.email && foundCustomer.email !== user.email) {
                        this.logger.warn(`Email mismatch detected! User email: ${user.email}, Accurate email: ${foundCustomer.email}`);
                        this.logger.warn(`Customer might be incorrect, but continuing with found customer.`);
                    }
                    
                    if (foundCustomer) {
                        return foundCustomer;
                    }
                }

                if (!foundCustomer) {
                    this.logger.warn(`Customer with customerNo ${user.accurateCustomerNo} not found in Accurate despite local record existing.`);
                    this.logger.log(`Will reset local record and create new customer.`);
                    
                    await this.prisma.user.update({
                        where: { id: user.id },
                        data: { accurateCustomerNo: null },
                    });
                }
            } catch (error) {
                this.logger.error(`Failed to fetch existing customer ${user.accurateCustomerNo}. Will attempt to create a new one.`, error.response?.data || error.message);
                
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { accurateCustomerNo: null },
                });
            }
        }

        const newCustomerNo = `ECOMM-${user.id}`;
        this.logger.log(`Creating new customer in Accurate with customerNo: ${newCustomerNo} for user: ${user.email}`);
        
        try {
            const customerName = user.name || user.email;
            
            const createPayload = { 
                name: customerName, 
                customerNo: newCustomerNo, 
                email: user.email
            };

            this.logger.log(`Sending customer creation payload: ${JSON.stringify(createPayload)}`);
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', createPayload);

            if (createResponse.data?.s) {
                const newAccurateCustomer: AccurateCustomer = createResponse.data.r;
                this.logger.log(`Successfully created new customer in Accurate with ID: ${newAccurateCustomer.id}, customerNo: ${newAccurateCustomer.customerNo}, name: ${newAccurateCustomer.name}`);
                
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { accurateCustomerNo: newCustomerNo },
                });
                
                return newAccurateCustomer;
            } else {
                 const errorMessage = createResponse.data?.d?.[0] || 'Failed to create customer.';
                 this.logger.error(`Accurate API error on customer creation: ${errorMessage}`);
                 this.logger.error(`Full response: ${JSON.stringify(createResponse.data)}`);
                 throw new Error(errorMessage);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`Error creating customer ${newCustomerNo} for user ${user.email}: ${errorMessage}`, error.response?.data);
            this.logger.error(`Full error response:`, error.response?.data);
            throw new Error(`Failed to create customer in Accurate: ${errorMessage}`);
        }
    }
}