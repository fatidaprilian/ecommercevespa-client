// file: vespa-ecommerce-api/src/orders/orders.controller.ts

import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { AuthGuard } from '@nestjs/passport'; // <-- TAMBAHKAN BARIS INI

@Controller('orders')
@UseGuards(AuthGuard('jwt')) // Melindungi semua endpoint di controller ini
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id;
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    // Di masa depan, kita bisa filter berdasarkan req.user.role di sini
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    // Di masa depan, kita bisa cek apakah req.user.id cocok dengan order.userId
    return this.ordersService.findOne(id);
  }
}