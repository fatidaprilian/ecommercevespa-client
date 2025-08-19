// file: src/shipping/shipping.controller.ts

import { Controller, Get, Post, Body, Query, UseGuards, Param } from '@nestjs/common';
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
    return this.shippingService.calculateShippingCost(
        body.destination_area_id, 
        body.items
    );
  }

  /**
   * ✅ ENDPOINT BARU: Endpoint publik untuk melacak pengiriman.
   * @param waybillId - Nomor resi (AWB).
   * @param courierCode - Kode kurir.
   */
  @Get('track/:waybillId/:courierCode')
  @Public()
  trackShipment(
    @Param('waybillId') waybillId: string,
    @Param('courierCode') courierCode: string,
  ) {
    return this.shippingService.getTrackingInfo(waybillId, courierCode);
  }
}