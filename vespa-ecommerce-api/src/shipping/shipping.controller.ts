// file: vespa-ecommerce-api/src/shipping/shipping.controller.ts

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { CalculateCostDto } from './dto/calculate-cost.dto';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('areas')
  @Public()
  searchAreas(@Query('q') searchTerm: string) {
    return this.shippingService.searchAreas(searchTerm);
  }

  @Post('cost')
  @UseGuards(AuthGuard('jwt'))
  calculateCost(@Body() body: CalculateCostDto) {
    // 👇 **PERBAIKAN UTAMA DI SINI** 👇
    // Hapus argumen kedua (destination_postal_code) agar sesuai dengan
    // definisi fungsi di shipping.service.ts.
    return this.shippingService.calculateShippingCost(
        body.destination_area_id, 
        body.items
    );
    // 👆 **END OF CHANGES** 👆
  }
}