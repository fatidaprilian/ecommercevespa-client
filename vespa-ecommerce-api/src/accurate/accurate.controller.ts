import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccurateService } from './accurate.service';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

/**
 * Karena ada global prefix 'api/v1' di main.ts,
 * controller ini akan menangani route '/api/v1/accurate'.
 */
@Controller('accurate')
export class AccurateController {
  private readonly adminUrl: string;

  constructor(
    private readonly accurateService: AccurateService,
    private readonly configService: ConfigService,
  ) {
    this.adminUrl = this.configService.get<string>('ADMIN_URL') || 'http://localhost:3003';
  }

  @Get('authorize-url')
  getAuthorizationUrl() {
    const url = this.accurateService.getAuthorizationUrl();
    return { url };
  }

  @Get('status')
  async getStatus() {
    return this.accurateService.isConnected();
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    const adminSettingsUrl = `${this.adminUrl}/settings`;

    if (!code) {
      return res.redirect(`${adminSettingsUrl}?error=authorization_failed`);
    }
    
    try {
      await this.accurateService.handleCallback(code);
      return res.redirect(`${adminSettingsUrl}?success=true`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.redirect(`${adminSettingsUrl}?error=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Get('databases')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async getDatabases() {
      return this.accurateService.getDatabaseList();
  }

  @Post('open-database')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async openDatabase(@Body('id') id: string) {
      return this.accurateService.openDatabase(id);
  }
}