// file: vespa-ecommerce-api/src/shipping/shipping.service.ts

import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly rajaOngkirApiUrl: string = 'https://rajaongkir.komerce.id/api/v1';
  private readonly rajaOngkirApiKey: string;
  private readonly originDistrictId: string;

  constructor(private configService: ConfigService) {
    this.rajaOngkirApiKey = this.configService.get<string>('RAJAONGKIR_API_KEY')!;
    this.originDistrictId = this.configService.get<string>('RAJAONGKIR_ORIGIN_DISTRICT_ID')!;
    if (!this.originDistrictId) {
        throw new InternalServerErrorException('RAJAONGKIR_ORIGIN_DISTRICT_ID tidak diatur di .env');
    }
  }

  async getProvinces() {
    try {
      const response = await axios.get(`${this.rajaOngkirApiUrl}/destination/province`, {
        headers: { key: this.rajaOngkirApiKey },
      });
      return response.data.data; 
    } catch (error) {
      console.error('RajaOngkir Error (getProvinces):', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal mengambil data provinsi');
    }
  }

  async getCities(provinceId: string) {
    if (!provinceId) throw new BadRequestException('Province ID diperlukan.');
    try {
      const response = await axios.get(`${this.rajaOngkirApiUrl}/destination/city/${provinceId}`, {
        headers: { key: this.rajaOngkirApiKey },
      });
      return response.data.data;
    } catch (error) {
      console.error('RajaOngkir Error (getCities):', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal mengambil data kota');
    }
  }

  async getDistricts(cityId: string) {
    if (!cityId) throw new BadRequestException('City ID diperlukan.');
    try {
        const response = await axios.get(`${this.rajaOngkirApiUrl}/destination/district/${cityId}`, {
            headers: { key: this.rajaOngkirApiKey },
        });
        return response.data.data;
    } catch (error) {
        console.error('RajaOngkir Error (getDistricts):', error.response?.data || error.message);
        throw new InternalServerErrorException('Gagal mengambil data kecamatan');
    }
  }

  async calculateShippingCost(destinationDistrictId: string, weight: number, courier: string) {
    const params = new URLSearchParams();
    params.append('origin', this.originDistrictId);
    params.append('destination', destinationDistrictId);
    params.append('weight', weight.toString());
    params.append('courier', courier.toLowerCase());

    try {
      // --- PERBAIKAN UTAMA: HAPUS '/district' DARI URL DI BAWAH INI ---
      const response = await axios.post(
        `${this.rajaOngkirApiUrl}/calculate/domestic-cost`, // URL yang benar
        params,
        {
          headers: { 
            key: this.rajaOngkirApiKey,
            'Content-Type': 'application/x-www-form-urlencoded' 
          },
        }
      );

      const flatServices = response.data.data;

      if (!Array.isArray(flatServices) || flatServices.length === 0) {
        return [];
      }
      
      const formattedCosts = flatServices.map(service => ({
        service: service.service,
        description: service.description,
        cost: [{
            value: service.cost,
            etd: service.etd,
            note: ''
          }]
      }));
      
      const finalResponse = [{
          code: courier.toLowerCase(),
          name: flatServices[0].name,
          costs: formattedCosts
      }];

      return finalResponse;

    } catch (error) {
      console.error('RajaOngkir Final Error (calculateCost):', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal menghitung ongkos kirim dari RajaOngkir');
    }
  }
}