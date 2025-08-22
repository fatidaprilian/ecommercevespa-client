// src/shipments/shipments.controller.ts

import { Controller, Param, Post, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from '@prisma/client';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';

@Controller('shipments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('order/:orderId')
  @Roles(Role.ADMIN)
  create(
    @Param('orderId') orderId: string,
    @Body() createShipmentDto: CreateShipmentDto,
  ) {
    // Panggil service dengan data baru
    return this.shipmentsService.createShipment(
      orderId,
      createShipmentDto.courier_company,
      createShipmentDto.courier_type,
    );
  }
}