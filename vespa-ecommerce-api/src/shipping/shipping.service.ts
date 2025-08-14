// file: vespa-ecommerce-api/src/shipping/shipping.service.ts

import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ShippingService {
  private readonly rajaOngkirApiKey: string;
  private readonly rajaOngkirApiUrl: string = 'https://rajaongkir.komerce.id/api/v1';

  constructor(private configService: ConfigService) {
    this.rajaOngkirApiKey = this.configService.get<string>('RAJAONGKIR_API_KEY')!;
  }

  // Mengambil daftar provinsi
  async getProvinces() {
    try {
      const response = await axios.get(`${this.rajaOngkirApiUrl}/destination/province`, {
        headers: { key: this.rajaOngkirApiKey },
      });
      return response.data.data; 
    } catch (error) {
      console.error('RajaOngkir V2 Error (getProvinces):', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal mengambil data provinsi');
    }
  }

  // Mengambil daftar kota berdasarkan ID provinsi
  async getCities(provinceId: string) {
    if (!provinceId) throw new BadRequestException('Province ID diperlukan.');
    try {
      const response = await axios.get(`${this.rajaOngkirApiUrl}/destination/city/${provinceId}`, {
        headers: { key: this.rajaOngkirApiKey },
      });
      return response.data.data;
    } catch (error) {
      console.error('RajaOngkir V2 Error (getCities):', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal mengambil data kota');
    }
  }

  // Mengambil daftar kecamatan berdasarkan ID kota
  async getDistricts(cityId: string) {
    if (!cityId) throw new BadRequestException('City ID diperlukan.');
    try {
        const response = await axios.get(`${this.rajaOngkirApiUrl}/destination/district/${cityId}`, {
            headers: { key: this.rajaOngkirApiKey },
        });
        return response.data.data;
    } catch (error) {
        console.error('RajaOngkir V2 Error (getDistricts):', error.response?.data || error.message);
        throw new InternalServerErrorException('Gagal mengambil data kecamatan');
    }
  }

  // Menghitung ongkos kirim menggunakan ID Kecamatan
  async calculateShippingCost(originDistrictId: string, destinationDistrictId: string, weight: number, courier: string) {
    try {
      const response = await axios.post(
        // 1. Gunakan URL yang panjang dan spesifik sesuai dokumentasi
        `${this.rajaOngkirApiUrl}/calculate/district/domestic-cost`,
        // 2. Body request sebagai objek JSON biasa
        {
          origin: originDistrictId,
          destination: destinationDistrictId,
          weight: weight,
          courier: courier.toLowerCase(),
        },
        {
          headers: { 
            key: this.rajaOngkirApiKey,
            // 3. Pastikan Content-Type adalah application/json sesuai contoh fetch
            'Content-Type': 'application/json' 
          },
        }
      );
      // API V2 mengembalikan data di dalam properti 'data'
      return response.data.data;
    } catch (error) {
      // Log error yang lebih detail untuk debugging
      console.error('RajaOngkir Final Error (calculateCost):', error.response?.data || error.message);
      throw new InternalServerErrorException('Gagal menghitung ongkos kirim dari RajaOngkir');
    }
  }
}