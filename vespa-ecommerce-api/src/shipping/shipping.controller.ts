// file: vespa-ecommerce-api/src/shipping/shipping.controller.ts

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';

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
  
  @Public() 
  @Get('districts')
  getDistricts(@Query('cityId') cityId: string) {
    return this.shippingService.getDistricts(cityId);
  }

  @Post('cost')
  @UseGuards(AuthGuard('jwt'))
  calculateCost(@Body() body: { destination: string; weight: number; courier: string }) {
    return this.shippingService.calculateShippingCost(body.destination, body.weight, body.courier);
  }
}