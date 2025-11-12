// src/accurate-pricing/accurate-pricing.service.ts

import { Injectable, Logger, Inject, InternalServerErrorException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { AccurateService } from '../accurate/accurate.service';
import { AccurateSyncService } from '../accurate-sync/accurate-sync.service';

@Injectable()
export class AccuratePricingService {
  private readonly logger = new Logger(AccuratePricingService.name);
  private readonly PRICE_CACHE_TTL = 600 * 1000; 

  constructor(
    private readonly accurateService: AccurateService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly accurateSyncService: AccurateSyncService,
  ) {}

  async createCustomer(data: { name: string; email: string }): Promise<string> {
    this.logger.log(`Creating new customer in Accurate for: ${data.email}`);
    try {
      const apiClient = await this.accurateService.getAccurateApiClient();
      
      const defaultPriceCategoryId = this.configService.get('ACCURATE_DEFAULT_PRICE_CATEGORY_ID');

      if (!defaultPriceCategoryId) {
          this.logger.warn('ACCURATE_DEFAULT_PRICE_CATEGORY_ID not set in .env, using default fallback if applicable, or request might fail.');
      }

      const payload: any = {
        name: data.name,
        email: data.email,
        customerNo: `WEB-${Date.now().toString().slice(-6)}`, 
      };

      // 🔥 FIX: Gunakan 'priceCategoryId' bukan 'categoryId'
      if (defaultPriceCategoryId) {
          payload.priceCategoryId = defaultPriceCategoryId; 
      }

      const response = await apiClient.post('/accurate/api/customer/save.do', payload);

      if (!response.data?.s) {
        throw new Error(response.data?.d?.[0] || 'Gagal membuat customer di Accurate.');
      }

      const newCustomerNo = response.data.r.customerNo;
      this.logger.log(`Successfully created customer: ${newCustomerNo}`);
      return newCustomerNo;
    } catch (error) {
      this.logger.error(`Failed createCustomer: ${error.message}`, error.response?.data);
      throw error; 
    }
  }

  /**
   * Ambil daftar kategori harga dari Accurate.
   * Cached selama 24 jam untuk efisiensi API.
   */
  async getPriceCategories() {
    const cacheKey = 'accurate:price-categories';
    
    // CEK CACHE DULU (TTL 24 JAM)
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug('Price categories loaded from CACHE (no API call)');
      return cached;
    }

    try {
      const apiClient = await this.accurateService.getAccurateApiClient();
      
      // API ini sudah benar untuk mengambil Kategori Penjualan
      const response = await apiClient.get('/accurate/api/price-category/list.do', {
        params: {
          fields: 'id,name,defaultCategory',
          'sp.pageSize': 100,
        },
      });

      if (!response.data?.s) {
        throw new Error(response.data?.d?.[0] || 'Gagal mengambil data kategori harga dari Accurate.');
      }

      const categories = response.data.d.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        isDefault: cat.defaultCategory || false,
      }));

      // SIMPAN KE CACHE (TTL 24 JAM = 86400000 MS)
      await this.cacheManager.set(cacheKey, categories, 86400000);
      this.logger.log(`Price categories fetched from Accurate API & cached for 24h (${categories.length} categories)`);

      return categories;

    } catch (error) {
      this.logger.error(`Failed getPriceCategories: ${error.message}`, error.response?.data);
      return [];
    }
  }

  /**
   * Clear cache kategori (untuk manual refresh kalau ada kategori baru di Accurate)
   */
  async clearPriceCategoriesCache(): Promise<void> {
    await this.cacheManager.del('accurate:price-categories');
    this.logger.log('Price categories cache cleared');
  }

  /**
   * Mengupdate kategori penjualan pelanggan di Accurate.
   * Dipanggil otomatis saat Admin mengubah kategori harga user di website.
   */
  async updateCustomerCategory(customerNo: string, priceCategoryId: number): Promise<void> {
    this.logger.log(`Updating Accurate customer ${customerNo} to price category ID ${priceCategoryId}`);
    try {
      // STEP 1: Gunakan searchCustomer() yang sudah proven work
      const customer = await this.accurateSyncService.searchCustomer(customerNo);
      
      if (!customer) {
        throw new Error(`Customer ${customerNo} tidak ditemukan di Accurate setelah semua strategi pencarian.`);
      }

      const customerId = customer.id;
      const customerName = customer.name;
      
      this.logger.debug(`Found customer via searchCustomer(): ID ${customerId}, Name: ${customerName}`);

      // STEP 2: Update dengan MINIMAL PAYLOAD
      const apiClient = await this.accurateService.getAccurateApiClient();
      
      // 🔥 FIX: Gunakan 'priceCategoryId' agar yang terupdate adalah Kategori Penjualan
      const updatePayload = {
        id: customerId,
        name: customerName,
        priceCategoryId: priceCategoryId 
      };
      
      this.logger.debug(`Sending update payload:`, JSON.stringify(updatePayload));

      const response = await apiClient.post('/accurate/api/customer/save.do', updatePayload);

      if (!response.data?.s) {
        throw new Error(response.data?.d?.[0] || 'Gagal update customer di Accurate.');
      }
      
      // FIX: CLEAR CACHE SETELAH UPDATE BERHASIL
      this.accurateSyncService.clearCustomerCache(customerNo);
      this.logger.debug(`Customer cache cleared for ${customerNo} after category update`);
      
      this.logger.log(`✅ Successfully updated customer price category for ${customerNo} (ID: ${customerId}) to category ID ${priceCategoryId}`);
    } catch (error) {
      this.logger.error(`❌ Failed updateCustomerCategory: ${error.message}`, error.response?.data);
    }
  }

  /**
   * Ambil kategori PENJUALAN customer dari Accurate (real-time).
   * Digunakan untuk manual sync button di edit user.
   */
  async getCustomerCategoryFromAccurate(customerNo: string): Promise<{ categoryId: number | null; categoryName: string | null }> {
    try {
      this.logger.log(`Fetching customer PRICE category from Accurate for: ${customerNo}`);
      
      const customer = await this.accurateSyncService.searchCustomer(customerNo);
      
      if (!customer) {
        this.logger.warn(`Customer ${customerNo} tidak ditemukan di Accurate`);
        return { categoryId: null, categoryName: null };
      }

      // 🔥 FIX: Ambil dari 'priceCategory' bukan 'category'
      // Helper parseAccurateCustomer di SyncService harusnya sudah memetakan ini ke 'priceCategory' atau 'priceCategoryId'
      // Kita coba akses 'priceCategory' dulu (objek), kalau null coba 'priceCategoryId' (scalar)
      let priceCategoryId = customer.priceCategory?.id || customer.priceCategoryId;
      let priceCategoryName = customer.priceCategory?.name;

      if (!priceCategoryId) {
        this.logger.warn(`Customer ${customerNo} tidak punya Kategori Penjualan di Accurate`);
        return { categoryId: null, categoryName: null };
      }

      this.logger.log(`Customer ${customerNo} PRICE category from Accurate: ${priceCategoryName || 'Unknown Name'} (ID: ${priceCategoryId})`);
      
      return {
        categoryId: priceCategoryId,
        categoryName: priceCategoryName || null,
      };
    } catch (error) {
      this.logger.error(`Failed getCustomerCategoryFromAccurate: ${error.message}`);
      return { categoryId: null, categoryName: null };
    }
  }

  async getProductPrice(itemNoOrSku: string, customerNo: string): Promise<number | null> {
    const cacheKey = `price:${itemNoOrSku}:${customerNo}`;
    
    try {
      const cachedPrice = await this.cacheManager.get<number>(cacheKey);
      if (cachedPrice !== undefined && cachedPrice !== null) {
        return cachedPrice;
      }

      this.logger.debug(`Cache MISS for ${cacheKey}, fetching from API...`);
      
      const customer = await this.accurateSyncService.searchCustomer(customerNo);

      if (!customer) {
        this.logger.warn(`Customer ${customerNo} not found in Accurate after trying all search strategies`);
        return null;
      }

      // 🔥 FIX: Gunakan Kategori Penjualan (priceCategory) sebagai dasar pencarian harga
      const customerPriceCategoryName = customer.priceCategory?.name;
      
      if (!customerPriceCategoryName) {
        this.logger.warn(`Customer ${customerNo} (${customer.name}) has no PRICE category assigned. Cannot determine special price.`);
        // Jika tidak punya kategori penjualan, seharusnya pakai harga default barang (tidak perlu cari di adjustment)
        return null;
      }

      this.logger.debug(`✅ Customer ${customerNo} (${customer.name}) belongs to PRICE category: ${customerPriceCategoryName}`);

      const apiClient = await this.accurateService.getAccurateApiClient();
      
      const listResponse = await apiClient.get('/accurate/api/sellingprice-adjustment/list.do', {
        params: {
          'sp.pageSize': 100,
          fields: 'number,id,salesAdjustmentType',
        },
      });

      if (!listResponse.data?.s || !listResponse.data?.d || listResponse.data.d.length === 0) {
        this.logger.warn(`No price adjustment records found in Accurate`);
        return null;
      }

      const adjustments = listResponse.data.d;
      this.logger.debug(`Total adjustments found: ${adjustments.length}`);

      for (const adj of adjustments) {
        if (adj.salesAdjustmentType !== 'ITEM_PRICE_TYPE') {
          continue;
        }

        this.logger.debug(`Checking adjustment ${adj.number}...`);

        try {
          const detailResponse = await apiClient.get('/accurate/api/sellingprice-adjustment/detail.do', {
            params: {
              number: adj.number,
            },
          });

          if (!detailResponse.data?.s || !detailResponse.data?.d) {
            continue;
          }

          const detailData = detailResponse.data.d;
          
          if (!detailData.detailItem || !Array.isArray(detailData.detailItem)) {
            continue;
          }

          // Cek apakah adjustment ini berlaku untuk kategori penjualan customer ini
          // Biasanya kategori ada di header (detailData.priceCategory) atau per item
          const adjustmentCategoryName = detailData.priceCategory?.name;

          // Jika adjustment ini spesifik untuk kategori tertentu dan tidak cocok, skip
          if (adjustmentCategoryName && adjustmentCategoryName.toLowerCase() !== customerPriceCategoryName.toLowerCase()) {
             continue;
          }

          const matchingItem = detailData.detailItem.find((item: any) => {
            const itemNo = item.item?.no || item.itemNo;
            if (itemNo !== itemNoOrSku) return false;
            
            // Jika kategori tidak ada di header, cek per item (jarang terjadi tapi mungkin)
            const itemCategory = item.priceCategory?.name || item.priceCategoryName;
            if (itemCategory && itemCategory.toLowerCase() !== customerPriceCategoryName.toLowerCase()) {
                return false;
            }

            return true;
          });

          if (matchingItem && matchingItem.price !== undefined) {
            const finalPrice = matchingItem.price;
            
            if (typeof finalPrice === 'number') {
              this.logger.log(
                `✅ Found price for item ${itemNoOrSku} in PRICE category ${customerPriceCategoryName}: ${finalPrice} ` +
                `(Adjustment No: ${adj.number})`
              );

              await this.cacheManager.set(cacheKey, finalPrice, this.PRICE_CACHE_TTL);
              return finalPrice;
            }
          }
          
        } catch (detailError) {
          this.logger.warn(`Error fetching detail for adjustment ${adj.number}: ${detailError.message}`);
          continue;
        }
      }

      this.logger.warn(
        `No special price found for item ${itemNoOrSku} in PRICE category ${customerPriceCategoryName}. Using default price.`
      );
      return null;

    } catch (error) {
      this.logger.error(`Error in getProductPrice for item ${itemNoOrSku} / customer ${customerNo}: ${error.message}`, error.stack);
      return null;
    }
  }

  async invalidateCache(itemNoOrSku: string, customerNo: string): Promise<void> {
     const cacheKey = `price:${itemNoOrSku}:${customerNo}`;
     await this.cacheManager.del(cacheKey);
     this.logger.debug(`Invalidated price cache for ${cacheKey}`);
  }
}