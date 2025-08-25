// file: src/discounts/discounts.controller.ts

import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Post, 
  Delete, 
  HttpCode, 
  HttpStatus, 
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AddDiscountRuleDto } from './dto/add-discount-rule.dto'; 
import { Role } from '@prisma/client';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { AuthGuard } from '@nestjs/passport';


@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get('user/:userId')
  findDiscountsByUserId(
    @Param('userId') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.discountsService.findDiscountsByUserId(userId, paginationDto);
  }

  @Patch('user/:userId/default')
  updateDefaultDiscount(
    @Param('userId') userId: string,
    @Body('defaultDiscountPercentage') discount: number,
  ) {
    return this.discountsService.updateDefaultDiscount(userId, discount);
  }

  @Post('user/:userId/rules')
  addDiscountRule(
      @Param('userId') userId: string,
      @Body() addDiscountRuleDto: AddDiscountRuleDto
  ) {
      return this.discountsService.addDiscountRule(userId, addDiscountRuleDto);
  }

  @Delete('user/:userId/rules/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDiscountRule(@Param('ruleId') ruleId: string) {
      return this.discountsService.removeDiscountRule(ruleId);
  }
}