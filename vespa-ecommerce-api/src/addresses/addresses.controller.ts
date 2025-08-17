// file: src/addresses/addresses.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@UseGuards(AuthGuard('jwt'))
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createAddressDto: CreateAddressDto) {
    return this.addressesService.create(req.user.id, createAddressDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.addressesService.findAll(req.user.id);
  }
  
  @Patch(':id')
  update(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateAddressDto: UpdateAddressDto) {
    return this.addressesService.update(req.user.id, id, updateAddressDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Mengembalikan status 204 No Content yang umum untuk delete
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.addressesService.remove(req.user.id, id);
  }
}