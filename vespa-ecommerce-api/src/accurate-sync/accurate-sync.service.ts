// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateService } from '../accurate/accurate.service';
import { Order, User } from '@prisma/client';
import { AxiosInstance } from 'axios';

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
    
    // Cache mechanism for customer search optimization
    private customerCache = new Map<string, { customer: AccurateCustomer; timestamp: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    
    // Track failed searches to avoid repeated expensive operations
    private failedSearchCache = new Map<string, number>();
    private readonly FAILED_SEARCH_TTL = 2 * 60 * 1000; // 2 minutes for failed searches

    constructor(
        private readonly prisma: PrismaService,
        private readonly accurateService: AccurateService,
        @InjectQueue('accurate-sync-queue') private readonly syncQueue: Queue,
    ) {}
    
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

    async processSalesOrderCreation(orderId: string) {
        this.logger.log(`WORKER: Processing Sales Order creation for Order ID: ${orderId}`);
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { user: true, items: { include: { product: true } } },
        });
        if (!order) {
            throw new Error(`Order with ID ${orderId} not found during job processing.`);
        }
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
            await this.prisma.order.update({
                where: { id: orderId },
                data: { accurateSalesOrderNumber: salesOrderNumber },
            });
            this.logger.log(`✅✅✅ WORKER SUCCESS: Sales Order ${salesOrderNumber} created in Accurate for order ${order.orderNumber}. Status remains PENDING until invoice is created.`);
            return response.data.r;
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            this.logger.error(`[FATAL WORKER] Sales Order creation for Order ID: ${orderId} failed. Reason: ${errorMessage}`, error.stack);
            throw new Error(`Failed to process sale in Accurate: ${errorMessage}`);
        }
    }
    
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async scheduleWebhookRenewal() {
        this.logger.log('CRON JOB: Triggering Accurate webhook renewal.');
        await this.accurateService.renewWebhook();
    }

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

    /**
     * Optimized customer search with multiple strategies and intelligent pagination
     */
    private async findCustomerByNo(apiClient: AxiosInstance, customerNo: string): Promise<AccurateCustomer | null> {
        // Check failed search cache first to avoid repeated expensive operations
        const failedSearch = this.failedSearchCache.get(customerNo);
        if (failedSearch && (Date.now() - failedSearch) < this.FAILED_SEARCH_TTL) {
            this.logger.debug(`[Cache Skip] Pencarian ${customerNo} dilewati karena baru saja gagal.`);
            return null;
        }

        // Strategy 1: Direct ID lookup (if Accurate API supports it)
        try {
            const directResponse = await apiClient.get(`/accurate/api/customer/detail.do`, {
                params: { customerNo: customerNo }
            });
            if (directResponse.data?.s && directResponse.data?.r) {
                this.logger.log(`[Pencarian Langsung] Pelanggan ${customerNo} ditemukan.`);
                return directResponse.data.r;
            }
        } catch (e) {
            this.logger.debug(`[Pencarian Langsung] Tidak berhasil untuk ${customerNo}: ${e.message}`);
        }

        // Strategy 2: Enhanced filter search with exact match
        try {
            const searchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                params: {
                    fields: 'id,name,customerNo,email',
                    'filter.customerNo.op': 'EQUAL',
                    'filter.customerNo.val[0]': customerNo,
                    'sp.pageSize': 1
                }
            });
            
            if (searchResponse.data?.s && searchResponse.data?.d?.length > 0) {
                const customer = searchResponse.data.d[0];
                if (customer.customerNo === customerNo) {
                    this.logger.log(`[Pencarian Filter EQUAL] Pelanggan ${customerNo} ditemukan.`);
                    return customer;
                }
            }
        } catch (e) {
            this.logger.debug(`[Pencarian Filter EQUAL] Gagal untuk ${customerNo}: ${e.message}`);
        }

        // Strategy 3: Search with CONTAINS operator
        try {
            const containsSearchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                params: {
                    fields: 'id,name,customerNo,email',
                    'filter.customerNo.op': 'CONTAINS',
                    'filter.customerNo.val[0]': customerNo,
                    'sp.pageSize': 10
                }
            });
            
            if (containsSearchResponse.data?.s && containsSearchResponse.data?.d?.length > 0) {
                const exactMatch = containsSearchResponse.data.d.find((c: AccurateCustomer) => c.customerNo === customerNo);
                if (exactMatch) {
                    this.logger.log(`[Pencarian CONTAINS] Pelanggan ${customerNo} ditemukan.`);
                    return exactMatch;
                }
            }
        } catch (e) {
            this.logger.debug(`[Pencarian CONTAINS] Gagal untuk ${customerNo}: ${e.message}`);
        }

        // Strategy 4: Search with LIKE operator for partial match
        try {
            const likeSearchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                params: {
                    fields: 'id,name,customerNo,email',
                    'filter.customerNo.op': 'LIKE',
                    'filter.customerNo.val[0]': `%${customerNo}%`,
                    'sp.pageSize': 20
                }
            });
            
            if (likeSearchResponse.data?.s && likeSearchResponse.data?.d?.length > 0) {
                const exactMatch = likeSearchResponse.data.d.find((c: AccurateCustomer) => c.customerNo === customerNo);
                if (exactMatch) {
                    this.logger.log(`[Pencarian LIKE] Pelanggan ${customerNo} ditemukan.`);
                    return exactMatch;
                }
            }
        } catch (e) {
            this.logger.debug(`[Pencarian LIKE] Gagal untuk ${customerNo}: ${e.message}`);
        }

        // Strategy 5: Try different filter operators for better compatibility
        const filterOperators = ['STARTS_WITH', 'ENDS_WITH'];
        
        for (const operator of filterOperators) {
            try {
                let filterValue = customerNo;
                if (operator === 'STARTS_WITH') {
                    filterValue = customerNo.split('-')[0]; // Try "ECOMM" part
                } else if (operator === 'ENDS_WITH') {
                    const parts = customerNo.split('-');
                    if (parts.length > 1) {
                        filterValue = parts[parts.length - 1]; // Try the ID part
                    }
                }
                
                const operatorSearchResponse = await apiClient.get('/accurate/api/customer/list.do', {
                    params: {
                        fields: 'id,name,customerNo,email',
                        [`filter.customerNo.op`]: operator,
                        [`filter.customerNo.val[0]`]: filterValue,
                        'sp.pageSize': 50
                    }
                });
                
                if (operatorSearchResponse.data?.s && operatorSearchResponse.data?.d?.length > 0) {
                    const exactMatch = operatorSearchResponse.data.d.find((c: AccurateCustomer) => c.customerNo === customerNo);
                    if (exactMatch) {
                        this.logger.log(`[Pencarian ${operator}] Pelanggan ${customerNo} ditemukan.`);
                        return exactMatch;
                    }
                }
            } catch (e) {
                this.logger.debug(`[Pencarian ${operator}] Gagal untuk ${customerNo}: ${e.message}`);
            }
        }

        // Strategy 6: Try without any filters but with smarter sorting and smaller pages
        try {
            this.logger.log(`[Pencarian Tanpa Filter] Mencoba pencarian tanpa filter untuk ${customerNo}...`);
            
            // For ECOMM customers, try descending order first (newer customers)
            const sortOrder = customerNo.startsWith('ECOMM-') ? 'DESC' : 'ASC';
            const smallPageResponse = await apiClient.get('/accurate/api/customer/list.do', {
                params: {
                    fields: 'id,name,customerNo',
                    'sp.page': 1,
                    'sp.pageSize': 100, // Smaller page size for faster response
                    'sort.customerNo': sortOrder
                }
            });
            
            if (smallPageResponse.data?.s && smallPageResponse.data?.d?.length > 0) {
                const exactMatch = smallPageResponse.data.d.find((c: AccurateCustomer) => c.customerNo === customerNo);
                if (exactMatch) {
                    this.logger.log(`[Pencarian Tanpa Filter] Pelanggan ${customerNo} ditemukan di halaman 1.`);
                    return exactMatch;
                }
            }
        } catch (e) {
            this.logger.debug(`[Pencarian Tanpa Filter] Gagal untuk ${customerNo}: ${e.message}`);
        }

        // Strategy 7: Intelligent pagination search (for high-volume scenarios)
        try {
            this.logger.log(`[Pencarian Pagination] Memulai pencarian paginated untuk ${customerNo}...`);
            
            let page = 1;
            let hasMore = true;
            let totalSearched = 0;
            const maxRecordsToSearch = 5000; // Maximum 5000 records to search
            const pageSize = 200;
            
            // For ECOMM customers, we can optimize by searching recent records first (newer customers)
            const sortOrder = customerNo.startsWith('ECOMM-') ? 'DESC' : 'ASC';
            
            while (hasMore && totalSearched < maxRecordsToSearch) {
                try {
                    const listResponse = await apiClient.get('/accurate/api/customer/list.do', {
                        params: { 
                            fields: 'id,name,customerNo', 
                            'sp.page': page, 
                            'sp.pageSize': pageSize,
                            'sort.customerNo': sortOrder
                        }
                    });
                    
                    if (listResponse.data?.s && listResponse.data?.d?.length > 0) {
                        const customers = listResponse.data.d;
                        totalSearched += customers.length;
                        
                        const exactMatch = customers.find((c: AccurateCustomer) => c.customerNo === customerNo);
                        if (exactMatch) {
                            this.logger.log(`[Pencarian Pagination] Pelanggan ${customerNo} ditemukan di halaman ${page} (total searched: ${totalSearched}).`);
                            return exactMatch;
                        }

                        // Smart optimization: If we're looking for ECOMM customer and we've passed the likely range, stop
                        if (customerNo.startsWith('ECOMM-') && sortOrder === 'DESC') {
                            const hasNonEcommCustomers = customers.some(c => !c.customerNo.startsWith('ECOMM-'));
                            if (hasNonEcommCustomers) {
                                this.logger.log(`[Pencarian Pagination] Optimization: Reached non-ECOMM customers, stopping search for ${customerNo}.`);
                                break;
                            }
                        }

                        hasMore = listResponse.data.m?.next;
                        page++;
                        
                        // Add small delay to avoid overwhelming the API
                        if (page % 10 === 0) {
                            await delay(500);
                            this.logger.log(`[Pencarian Pagination] Searched ${totalSearched} records so far...`);
                        }
                        
                    } else {
                        hasMore = false;
                    }
                } catch (pageError) {
                    this.logger.error(`[Pencarian Pagination] Error di halaman ${page}: ${pageError.message}`);
                    hasMore = false;
                }
            }
            
            if (totalSearched >= maxRecordsToSearch) {
                this.logger.warn(`[Pencarian Pagination] Pencarian dihentikan setelah ${maxRecordsToSearch} records untuk efisiensi.`);
            }
            
        } catch (e) {
            this.logger.error(`[Pencarian Pagination] Gagal mencari ${customerNo}: ${e.message}`);
        }

        // Mark this search as failed to avoid repeated expensive operations
        this.failedSearchCache.set(customerNo, Date.now());
        this.logger.warn(`[Semua Strategi] Pelanggan ${customerNo} tidak ditemukan dengan semua metode pencarian.`);
        return null;
    }

    /**
     * Cached version of customer search for better performance
     */
    private async findCustomerByNoWithCache(apiClient: AxiosInstance, customerNo: string): Promise<AccurateCustomer | null> {
        // Check cache first
        const cached = this.customerCache.get(customerNo);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
            this.logger.log(`[Cache Hit] Pelanggan ${customerNo} ditemukan di cache.`);
            return cached.customer;
        }

        // If not in cache, search using optimized method
        const customer = await this.findCustomerByNo(apiClient, customerNo);
        
        // Cache the result (only cache successful results to avoid caching nulls)
        if (customer) {
            this.customerCache.set(customerNo, { customer, timestamp: Date.now() });
            // Remove from failed search cache if it exists
            this.failedSearchCache.delete(customerNo);
        }
        
        return customer;
    }

    /**
     * Clear caches - useful for testing or periodic cleanup
     */
    public clearCaches() {
        this.customerCache.clear();
        this.failedSearchCache.clear();
        this.logger.log('Customer search caches cleared.');
    }

    /**
     * Get cache statistics for monitoring
     */
    public getCacheStats() {
        return {
            customerCacheSize: this.customerCache.size,
            failedSearchCacheSize: this.failedSearchCache.size,
            customerCacheHits: Array.from(this.customerCache.values()).filter(c => (Date.now() - c.timestamp) < this.CACHE_TTL).length,
            failedSearchCacheHits: Array.from(this.failedSearchCache.entries()).filter(([_, timestamp]) => (Date.now() - timestamp) < this.FAILED_SEARCH_TTL).length
        };
    }

    private async findOrCreateCustomer(user: User): Promise<AccurateCustomer> {
        const apiClient = await this.accurateService.getAccurateApiClient();
        let customerToSearch: string | null = null;
        let isManualId = false;

        if (user.accurateCustomerNo && !user.accurateCustomerNo.startsWith('ECOMM-')) {
            this.logger.log(`[Jalur Prioritas] Menggunakan ID manual: ${user.accurateCustomerNo}`);
            customerToSearch = user.accurateCustomerNo;
            isManualId = true;
        } else {
            customerToSearch = `ECOMM-${user.id}`;
            this.logger.log(`[Jalur Otomatis] Menggunakan ID sistem: ${customerToSearch}`);
        }

        // Use cached search method
        let foundCustomer = await this.findCustomerByNoWithCache(apiClient, customerToSearch);

        if (!foundCustomer && isManualId) {
            this.logger.warn(`[Jalur Prioritas] ID manual ${customerToSearch} tidak ditemukan. Mencoba fallback ke ID sistem.`);
            customerToSearch = `ECOMM-${user.id}`;
            foundCustomer = await this.findCustomerByNoWithCache(apiClient, customerToSearch);
        }
        
        if (foundCustomer) {
            this.logger.log(`Pelanggan ditemukan: ${foundCustomer.customerNo}. Memastikan data lokal sinkron.`);
            if (user.accurateCustomerNo !== foundCustomer.customerNo) {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { accurateCustomerNo: foundCustomer.customerNo },
                });
            }
            return foundCustomer;
        }

        // Creation logic
        const customerIdToCreate = `ECOMM-${user.id}`;
        this.logger.log(`[Jalur Kreasi] Pelanggan tidak ditemukan. Membuat pelanggan baru dengan ID: ${customerIdToCreate}`);
        
        try {
            const createPayload = { 
                name: user.name || user.email, 
                customerNo: customerIdToCreate, 
                email: user.email
            };
            const createResponse = await apiClient.post('/accurate/api/customer/save.do', createPayload);

            if (createResponse.data?.s) {
                const newAccurateCustomer: AccurateCustomer = createResponse.data.r;
                this.logger.log(`[Jalur Kreasi] Pelanggan baru berhasil dibuat: ${newAccurateCustomer.customerNo}`);
                
                // Cache the new customer
                this.customerCache.set(newAccurateCustomer.customerNo, { 
                    customer: newAccurateCustomer, 
                    timestamp: Date.now() 
                });
                
                // Clear any failed search cache for this customer
                this.failedSearchCache.delete(customerIdToCreate);
                
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { accurateCustomerNo: newAccurateCustomer.customerNo },
                });
                return newAccurateCustomer;
            } else {
                const errorMessage = createResponse.data?.d?.[0] || 'Gagal membuat pelanggan di Accurate.';
                if (errorMessage.includes('Sudah ada data lain dengan ID Pelanggan')) {
                    this.logger.warn(`[Jalur Kreasi] Gagal membuat karena duplikat. Mencoba mencari ulang...`);
                    await delay(2000);
                    // Clear cache before retry
                    this.customerCache.delete(customerIdToCreate);
                    this.failedSearchCache.delete(customerIdToCreate);
                    const customer = await this.findCustomerByNoWithCache(apiClient, customerIdToCreate);
                    if (customer) {
                        this.logger.log(`[Jalur Kreasi] Pelanggan ditemukan setelah gagal membuat.`);
                        return customer;
                    }
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            const errorMessage = error.response?.data?.d?.[0] || error.message;
            if (errorMessage.includes('Sudah ada data lain dengan ID Pelanggan')) {
                this.logger.warn(`[Jalur Kreasi - Catch] Gagal membuat karena duplikat. Mencoba mencari ulang...`);
                await delay(2000);
                // Clear cache before retry
                this.customerCache.delete(customerIdToCreate);
                this.failedSearchCache.delete(customerIdToCreate);
                const customer = await this.findCustomerByNoWithCache(apiClient, customerIdToCreate);
                if (customer) {
                    this.logger.log(`[Jalur Kreasi - Catch] Pelanggan ditemukan setelah gagal membuat.`);
                    return customer;
                }
            }
            this.logger.error(`[Jalur Kreasi] Gagal membuat pelanggan di Accurate: ${errorMessage}`);
            throw new InternalServerErrorException(`Gagal membuat pelanggan di Accurate: ${errorMessage}`);
        }
    }
}