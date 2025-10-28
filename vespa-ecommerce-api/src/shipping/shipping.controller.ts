// file: src/shipping/shipping.controller.ts

import { Controller, Get, Post, Body, Query, UseGuards, Param, Req } from '@nestjs/common';
// --- TAMBAHAN: Import Throttle ---
import { Throttle } from '@nestjs/throttler';
// --- AKHIR TAMBAHAN ---
import { ShippingService } from './shipping.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { CalculateCostDto } from './dto/calculate-cost.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // Dibatasi 15 request per menit per IP. Cukup untuk autocomplete.
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('areas')
  @Public()
  searchAreas(@Query('q') searchTerm: string) {
    return this.shippingService.searchAreas(searchTerm);
  }
  // Dibatasi 5 request per menit per USER.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('cost')
  @UseGuards(AuthGuard('jwt'))
  calculateCost(
    @Body() body: CalculateCostDto,       
    @Req() req: AuthenticatedRequest  
  ) {
    const user = req.user; 

    return this.shippingService.calculateShippingCost(
        body,
        user
    );
  }

  // Dibatasi 10 request per menit per IP.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('track/:waybillId/:courierCode') 
  @Public()
  trackShipment(
    @Param('waybillId') waybillId: string,
    @Param('courierCode') courierCode: string,
  ) {
    return this.shippingService.getTrackingInfo(waybillId, courierCode);
  }
}