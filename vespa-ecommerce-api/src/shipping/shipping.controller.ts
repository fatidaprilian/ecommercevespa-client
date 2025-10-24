// file: src/shipping/shipping.controller.ts

import { Controller, Get, Post, Body, Query, UseGuards, Param, Req } from '@nestjs/common'; // <-- Pastikan Req ada
import { ShippingService } from './shipping.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { CalculateCostDto } from './dto/calculate-cost.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface'; // <-- Pastikan ini diimpor

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('areas')
  @Public()
  searchAreas(@Query('q') searchTerm: string) {
    return this.shippingService.searchAreas(searchTerm);
  }

  // --- Perubahan di sini ---
  @Post('cost')
  @UseGuards(AuthGuard('jwt'))
  calculateCost(
    @Body() body: CalculateCostDto,       // <-- Ambil DTO dari body
    @Req() req: AuthenticatedRequest   // <-- Ambil request
  ) {
    const user = req.user; // <-- Dapatkan user

    // Panggil service dengan DTO dan user
    return this.shippingService.calculateShippingCost(
        body,
        user
    );
  }

  @Get('track/:waybillId/:courierCode') 
  @Public()
  trackShipment(
    @Param('waybillId') waybillId: string,
    @Param('courierCode') courierCode: string,
  ) {
    return this.shippingService.getTrackingInfo(waybillId, courierCode);
  }
}