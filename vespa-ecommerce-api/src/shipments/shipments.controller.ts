// file: src/shipments/shipments.controller.ts
import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Role } from '@prisma/client';
import { ShipmentsService } from './shipments.service';

@Controller('shipments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post('order/:orderId')
  @Roles(Role.ADMIN) // Only admins can create shipments
  create(@Param('orderId') orderId: string) {
    return this.shipmentsService.createShipment(orderId);
  }
}