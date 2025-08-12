import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: any, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id;
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt')) // Sebaiknya hanya admin/user terkait yg bisa lihat
  findAll() {
    // TODO: Tambahkan logika untuk memfilter order berdasarkan role
    return this.ordersService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    // TODO: Tambahkan validasi apakah user boleh melihat order ini
    return this.ordersService.findOne(id);
  }
}