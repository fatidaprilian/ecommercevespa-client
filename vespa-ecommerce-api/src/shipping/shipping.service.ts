// file: vespa-ecommerce-api/src/shipping/shipping.service.ts

import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SettingsService } from 'src/settings/settings.service';
import { Order, OrderItem, Product, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ShippingService {
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
      throw new InternalServerErrorException('BITESHIP_API_KEY is not configured.');
    }
  }

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
      throw new InternalServerErrorException(
        'Origin Area ID and Postal Code must be set in the Admin Panel.',
      );
    }
  }
  
  private async getAvailableCouriers(): Promise<string> {
      try {
          const response = await axios.get(`${this.biteshipApiUrl}/v1/couriers`, {
              headers: { Authorization: this.biteshipApiKey },
          });
          if (!response.data.success || !Array.isArray(response.data.couriers) || response.data.couriers.length === 0) {
              throw new InternalServerErrorException('No couriers are activated in your Biteship account.');
          }
          const courierCodes = response.data.couriers.map((c: any) => c.courier_code);
          return [...new Set(courierCodes)].join(',');
      } catch (error) {
          throw new InternalServerErrorException(
            'Failed to retrieve available couriers from Biteship.'
          );
      }
  }

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
      throw new InternalServerErrorException('Gagal mengambil data area dari Biteship');
    }
  }

  async calculateShippingCost(
    destinationAreaId: string,
    items: { name: string, value: number, quantity: number, weight: number }[]
  ) {
    const origin = await this.getOriginData();
    if (origin.areaId === destinationAreaId) return [];
    
    const availableCouriers = await this.getAvailableCouriers();
    const payload = {
      origin_area_id: origin.areaId,
      destination_area_id: destinationAreaId,
      couriers: availableCouriers,
      items: items.map(item => ({...item, description: "Vespa Parts", length: 10, width: 10, height: 5 })),
    };
    try {
      const response = await axios.post(`${this.biteshipApiUrl}/v1/rates/couriers`, payload, {
          headers: { Authorization: this.biteshipApiKey, 'Content-Type': 'application/json' },
      });
      return response.data.pricing || [];
    } catch (error) {
      console.error('Biteship Rates Axios Error:', error.response?.data);
      return [];
    }
  }

  async createShipmentBooking(order: Order & { user: User, items: (OrderItem & { product: Product })[] }, courierData: { company: string, type: string }) {
      const originSettings = await this.settingsService.getAllSettings();
      const settingsMap = new Map(originSettings.map(s => [s.key, s.value]));
      const originData = await this.getOriginData();
      
      const userAddress = await this.prisma.address.findFirst({
        where: { userId: order.userId, street: { contains: order.shippingAddress.split(',')[0] } },
        orderBy: { isDefault: 'desc' }
      });

      const payload = {
          // ==================== PERBAIKAN UTAMA DI SINI ====================
          // Mengganti nama field agar sesuai dengan dokumentasi API Orders Biteship
          origin_contact_name: settingsMap.get('WAREHOUSE_PIC_NAME') || 'Admin VespaParts',
          origin_contact_phone: settingsMap.get('WAREHOUSE_PHONE') || '081234567890',
          origin_address: settingsMap.get('WAREHOUSE_FULL_ADDRESS') || 'Cibinong, Bogor',
          origin_postal_code: parseInt(settingsMap.get('BITESHIP_ORIGIN_POSTAL_CODE') ?? '16911'),
          origin_area_id: originData.areaId,

          destination_contact_name: order.user.name,
          destination_contact_phone: userAddress?.phone || '080000000000',
          destination_address: order.shippingAddress,
          destination_area_id: order.destinationAreaId,
          // ===============================================================

          courier_company: courierData.company,
          courier_type: courierData.type,
          delivery_type: "now",
          order_id: order.id,
          items: order.items.map(item => ({
              id: item.productId, name: item.product.name, value: Math.round(item.price), quantity: item.quantity,
              weight: item.product.weight || 1000, height: 5, width: 10, length: 10,
          }))
      };

      try {
          const response = await axios.post(`${this.biteshipApiUrl}/v1/orders`, payload, {
              headers: { Authorization: this.biteshipApiKey },
          });
          if (!response.data.success) {
              throw new InternalServerErrorException(response.data.error || 'Biteship booking failed');
          }
          return response.data;
      } catch (error) {
          const biteshipError = error.response?.data;
          console.error('--- BITEShip BOOKING FAILED ---');
          console.error('Full Payload Sent:', JSON.stringify(payload, null, 2));
          console.error('Biteship Response:', biteshipError);
          console.error('---------------------------------');
          throw new InternalServerErrorException(biteshipError?.error || 'Gagal membuat pesanan pengiriman ke Biteship');
      }
  }
}