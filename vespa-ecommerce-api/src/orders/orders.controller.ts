// src/orders/orders.controller.ts

import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '@nestjs/passport';
// Hapus import Request dari 'express'
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface'; // <-- INI BENAR

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createOrderDto: CreateOrderDto) { // <-- 2. Gunakan type baru
    const userId = req.user.sub; // <-- 3. Akses 'sub' dari payload, lebih aman
    return this.ordersService.create(userId, createOrderDto);
  }
}