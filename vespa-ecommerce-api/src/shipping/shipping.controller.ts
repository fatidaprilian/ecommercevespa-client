// file: vespa-ecommerce-api/src/shipping/shipping.controller.ts

import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { Public } from 'src/auth/decorators/public.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Public()
  @Get('provinces')
  getProvinces() {
    return this.shippingService.getProvinces();
  }

  @Public()
  @Get('cities')
  getCities(@Query('provinceId') provinceId: string) {
    return this.shippingService.getCities(provinceId);
  }

  // --- ENDPOINT BARU UNTUK KECAMATAN ---
  @Public() 
  @Get('districts')
  getDistricts(@Query('cityId') cityId: string) {
    return this.shippingService.getDistricts(cityId);
  }

  @Post('cost')
  // Menghitung ongkir sebaiknya hanya untuk user yang sudah login
  calculateCost(@Body() body: { origin: string; destination: string; weight: number; courier: string }) {
    // Pastikan parameter 'origin' dan 'destination' sekarang diisi dengan district_id
    return this.shippingService.calculateShippingCost(body.origin, body.destination, body.weight, body.courier);
  }
}