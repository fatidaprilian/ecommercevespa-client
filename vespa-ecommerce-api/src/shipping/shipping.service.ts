// file: vespa-ecommerce-api/src/shipping/shipping.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger // <-- Ditambahkan Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SettingsService } from 'src/settings/settings.service';
// <-- Ditambahkan Role
import { Order, OrderItem, Product, User, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CalculateCostDto } from './dto/calculate-cost.dto'; // <-- Impor DTO
import { UserPayload } from 'src/auth/interfaces/jwt.payload'; // <-- Impor UserPayload

@Injectable()
export class ShippingService {
  // Logger untuk debugging
  private readonly logger = new Logger(ShippingService.name);
  private readonly biteshipApiUrl: string = 'https://api.biteship.com';
  private readonly biteshipApiKey: string;

  constructor(
    private configService: ConfigService,
    private settingsService: SettingsService,
    private prisma: PrismaService,
  ) {
    this.biteshipApiKey =
      this.configService.get<string>('BITESHIP_API_KEY')!;
    if (!this.biteshipApiKey) {
      this.logger.error('BITESHIP_API_KEY is not configured.'); // Logging error
      throw new InternalServerErrorException('BITESHIP_API_KEY is not configured.');
    }
    // Verifikasi API Key saat inisialisasi (opsional tapi bagus)
    this.verifyBiteshipConnection();
  }

  // Fungsi untuk memverifikasi koneksi ke Biteship (tidak diubah)
  private async verifyBiteshipConnection() {
    try {
        await axios.get(`${this.biteshipApiUrl}/v1/couriers`, {
            headers: { Authorization: this.biteshipApiKey },
            timeout: 5000 // Timeout 5 detik
        });
        this.logger.log('Biteship API connection verified successfully.');
    } catch (error) {
        // Cek apakah error disebabkan oleh Axios atau bukan
        if (axios.isAxiosError(error)) {
             this.logger.error(`Failed to verify Biteship API connection. Status: ${error.response?.status}, Message: ${error.message}`, error.stack);
        } else {
             this.logger.error('Failed to verify Biteship API connection. Unknown error.', error instanceof Error ? error.stack : error);
        }
    }
  }


  // getOriginData (tidak diubah)
  private async getOriginData(): Promise<{ areaId: string; postalCode: string }> {
    try {
        const areaIdSetting = await this.settingsService.getSetting('BITESHIP_ORIGIN_AREA_ID');
        const postalCodeSetting = await this.settingsService.getSetting('BITESHIP_ORIGIN_POSTAL_CODE');
        if (!areaIdSetting?.value || !postalCodeSetting?.value) {
             throw new Error("Origin Area ID or Postal Code is not set.");
        }
        return {
            areaId: areaIdSetting.value,
            postalCode: postalCodeSetting.value
        };
    } catch (error) {
      this.logger.error('Failed to get origin data from settings', error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException(
        'Origin Area ID and Postal Code must be set in the Admin Panel.',
      );
    }
  }
  
  // getAvailableCouriers (tetap dikomentari)
  /*
  private async getAvailableCouriers(): Promise<string> {
      // ... (kode lama) ...
  }
  */

  // searchAreas (tidak diubah)
  async searchAreas(searchTerm: string) {
    if (!searchTerm || searchTerm.length < 3) {
      return [];
    }
    try {
      const response = await axios.get(
        `${this.biteshipApiUrl}/v1/maps/areas`,
        {
          params: { 'countries[]': 'ID', 'input': searchTerm, 'type': 'single' },
          headers: { Authorization: this.biteshipApiKey },
        },
      );
      return response.data?.areas || [];
    } catch (error) {
       if (axios.isAxiosError(error)) {
           this.logger.error(`Biteship Search Areas Axios Error: ${error.message}`, error.response?.data);
       } else {
           this.logger.error('Biteship Search Areas Unknown Error:', error);
       }
      throw new InternalServerErrorException('Gagal mengambil data area dari Biteship');
    }
  }

  // --- calculateShippingCost Direvisi ---
  async calculateShippingCost(
    calculateCostDto: CalculateCostDto, // <-- Terima DTO lengkap
    user: UserPayload // <-- Terima UserPayload (dari JWT)
  ): Promise<any[]> { // <-- Kembalikan array (misal: pricing)
    
    // Ambil data dari DTO
    const { destination_area_id, items } = calculateCostDto;
    
    const origin = await this.getOriginData();

    // Validasi dasar (tidak diubah)
    if (!destination_area_id) {
        this.logger.warn('calculateShippingCost called without destination_area_id');
        return []; 
    }
    if (origin.areaId === destination_area_id) {
        this.logger.log(`Origin and destination area ID are the same (${origin.areaId}), returning empty rates.`);
        return [];
    }
    if (!items || items.length === 0) {
        this.logger.warn('calculateShippingCost called without items');
        return [];
    }

    // Tentukan kurir yang diizinkan berdasarkan role
    let allowedCouriersString: string; // <-- Diubah ke string

    // Gunakan user.role (string dari UserPayload) dan bandingkan dengan string Enum
    if (user.role === Role.MEMBER.toString()) {
        allowedCouriersString = "jne,jnt"; // <-- Diubah ke string
        this.logger.log(`User ${user.email} is MEMBER. Allowed couriers: ${allowedCouriersString}`);
    } else {
        this.logger.warn(`User ${user.email} (Role: ${user.role}) called calculateShippingCost. Returning empty array as they are not MEMBER.`);
        return []; // Non-member (Reseller) tidak mendapat tarif Biteship
    }

    // Persiapkan payload sesuai API Biteship
    const payload = {
      origin_area_id: origin.areaId,
      destination_area_id: destination_area_id,
      // --- PERUBAHAN DI SINI ---
      // Ganti 'courier_companies' (array) kembali ke 'couriers' (string)
      couriers: allowedCouriersString, 
      // --- AKHIR PERUBAHAN ---
      items: items.map(item => ({
          name: item.name.substring(0, 49),
          description: "Vespa Parts",
          value: Math.round(item.value),
          quantity: item.quantity,
          weight: item.weight,
          length: 10,
          width: 10,
          height: 5
      })),
    };

    this.logger.debug(`Biteship Rates Payload for User ${user.email}: ${JSON.stringify(payload)}`); // Log payload baru

    try {
      // Panggil endpoint /v1/rates/couriers
      const response = await axios.post(`${this.biteshipApiUrl}/v1/rates/couriers`, payload, {
          headers: {
            Authorization: this.biteshipApiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // Timeout 10 detik
      });

      // Periksa respons sukses dari Biteship (tidak diubah)
      if (response.data && response.data.success === true && Array.isArray(response.data.pricing)) {
          this.logger.log(`Successfully fetched ${response.data.pricing.length} rates for Order to ${destination_area_id}. Couriers: ${response.data.pricing.map(p=>p.company).join(', ')}`);
          return response.data.pricing; // Kembalikan array pricing
      } else {
          this.logger.warn(`Biteship returned success=false or invalid pricing format for Order to ${destination_area_id}. Response:`, response.data);
          return [];
      }
    } catch (error) {
      // Tangani error Axios dengan lebih detail (tidak diubah)
      if (axios.isAxiosError(error)) {
        this.logger.error(`Biteship Rates Axios Error for User ${user.email}: ${error.message}. Status: ${error.response?.status}. Data:`, error.response?.data);
      } else {
        this.logger.error(`Biteship Rates Unknown Error for User ${user.email}:`, error);
      }
      return [];
    }
  }


  // createShipmentBooking (tidak diubah)
  async createShipmentBooking(order: Order & { user: User, items: (OrderItem & { product: Product })[] }, courierData: { company: string, type: string }) {
      const originSettings = await this.settingsService.getAllSettings();
      const settingsMap = new Map(originSettings.map(s => [s.key, s.value]));
      const originData = await this.getOriginData();
      
      const userAddress = await this.prisma.address.findFirst({
        where: { userId: order.userId, street: { contains: order.shippingAddress.split(',')[0] } },
        orderBy: { isDefault: 'desc' }
      });

      const payload = {
          origin_contact_name: settingsMap.get('WAREHOUSE_PIC_NAME') || 'Admin VespaParts',
          origin_contact_phone: settingsMap.get('WAREHOUSE_PHONE') || '081234567890',
          origin_address: settingsMap.get('WAREHOUSE_FULL_ADDRESS') || 'Cibinong, Bogor',
          origin_postal_code: parseInt(settingsMap.get('BITESHIP_ORIGIN_POSTAL_CODE') ?? '16911'),
          origin_area_id: originData.areaId,

          destination_contact_name: order.user.name,
          destination_contact_phone: userAddress?.phone || '080000000000',
          destination_address: order.shippingAddress,
          destination_area_id: order.destinationAreaId,
          destination_postal_code: parseInt(order.destinationPostalCode ?? '0'), 

          courier_company: courierData.company,
          courier_type: courierData.type,
          delivery_type: "now",
          order_id: order.id,
          items: order.items.map(item => ({
              id: item.productId, name: item.product.name.substring(0, 199), value: Math.round(item.price), quantity: item.quantity,
              weight: item.product.weight || 1000, height: 5, width: 10, length: 10,
              description: item.product.sku || "Vespa Part" 
          }))
      };

      this.logger.debug(`Biteship Booking Payload for Order ${order.id}: ${JSON.stringify(payload)}`);

      try {
          const response = await axios.post(`${this.biteshipApiUrl}/v1/orders`, payload, {
              headers: { Authorization: this.biteshipApiKey },
              timeout: 15000
          });
          if (!response.data.success) {
              const errorMsg = response.data?.error || response.data?.message || 'Biteship booking failed';
              this.logger.error(`Biteship booking failed for Order ${order.id}: ${errorMsg}`, response.data);
              throw new InternalServerErrorException(errorMsg);
          }
          this.logger.log(`Biteship booking successful for Order ${order.id}. Biteship Order ID: ${response.data.id}, Waybill: ${response.data.courier?.waybill_id}`);
          return response.data;
      } catch (error) {
          const biteshipError = axios.isAxiosError(error) ? error.response?.data : error;
          const errorMsg = biteshipError?.error || biteshipError?.message || 'Failed to create Biteship order';
          this.logger.error(`Biteship Booking Axios Error for Order ${order.id}: ${errorMsg}`, biteshipError);
          throw new InternalServerErrorException('Gagal membuat pesanan pengiriman ke Biteship.');
      }
  }

  // getTrackingInfo (tidak diubah)
  async getTrackingInfo(waybillId: string, courierCode: string) {
    try {
      const response = await axios.get(
        `${this.biteshipApiUrl}/v1/trackings/${waybillId}/couriers/${courierCode}`,
        {
          headers: { Authorization: this.biteshipApiKey },
          timeout: 8000
        },
      );

      if (!response.data.success) {
        this.logger.warn(`Biteship tracking failed for ${waybillId}/${courierCode}: ${response.data.message}`);
        throw new NotFoundException(response.data.message || 'Informasi pelacakan tidak ditemukan.');
      }
      this.logger.log(`Successfully fetched tracking for ${waybillId}/${courierCode}. Status: ${response.data.status}`);
      return response.data;
    } catch (error) {
        const biteshipError = axios.isAxiosError(error) ? error.response?.data : error;
        const errorMsg = biteshipError?.message || 'Failed to fetch tracking data';
        this.logger.error(`Biteship Tracking Error for ${waybillId}/${courierCode}: ${errorMsg}`, biteshipError);
      throw new NotFoundException(
        biteshipError?.message || `Gagal mengambil data pelacakan untuk resi ${waybillId}.`
      );
    }
  }
}