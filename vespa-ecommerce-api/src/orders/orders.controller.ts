// file: vespa-ecommerce-api/src/orders/orders.controller.ts

import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Query } from '@nestjs/common'; // 1. Impor Query
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { AuthGuard } from '@nestjs/passport';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto'; // 2. Impor DTO Paginasi

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id;
    return this.ordersService.create(userId, createOrderDto);
  }

  // 👇 --- PERUBAHAN UTAMA DI SINI --- 👇
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() paginationDto: PaginationDto & { search?: string } // 3. Terima query
  ) {
    // 4. Teruskan semua data (user dan query) ke service
    return this.ordersService.findAll(req.user, paginationDto);
  }
  // 👆 --- AKHIR PERUBAHAN --- 👆
  
  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
  
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto.status);
  }
}