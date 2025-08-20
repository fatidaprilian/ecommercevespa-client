// file: vespa-ecommerce-api/src/accurate/accurate.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { AccurateOAuth } from '@prisma/client';

@Injectable()
export class AccurateService {
  private readonly logger = new Logger(AccurateService.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authUrl: string;
  private readonly tokenUrl: string;
  private readonly apiUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // SOLUSI: Tambahkan '|| ""' untuk memberikan nilai default jika env var tidak ada.
    // Ini akan menghilangkan semua error TypeScript.
    this.clientId = this.configService.get<string>('ACCURATE_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('ACCURATE_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('ACCURATE_REDIRECT_URI') || '';
    this.authUrl = this.configService.get<string>('ACCURATE_AUTH_URL') || '';
    this.tokenUrl = this.configService.get<string>('ACCURATE_TOKEN_URL') || '';
    this.apiUrl = this.configService.get<string>('ACCURATE_API_BASE_URL') || '';
  }

  getAuthorizationUrl(): string {
    // Tambahkan pengecekan agar tidak error jika config dummy digunakan
    if (!this.clientId) {
        this.logger.warn('Accurate Client ID is not set. Authorization URL cannot be generated.');
        return '/error/accurate-not-configured';
    }
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: 'item_view sales_invoice_view',
    });
    return `${this.authUrl}?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<void> {
    if (!this.clientId || !this.clientSecret) {
        throw new Error('Accurate integration is not fully configured on the server.');
    }
    try {
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', this.redirectUri);

      const authHeader = Buffer.from(
        `${this.clientId}:${this.clientSecret}`,
      ).toString('base64');

      const response = await axios.post(this.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      });

      const { access_token, refresh_token, expires_in, scope, token_type } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      await this.prisma.accurateOAuth.deleteMany({});
      await this.prisma.accurateOAuth.create({
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          scope,
          tokenType: token_type,
        },
      });
      this.logger.log('✅ Successfully stored Accurate OAuth tokens.');
    } catch (error) {
      this.logger.error('🔴 Failed to exchange code for token', error.response?.data || error.message);
      throw new Error('Failed to get token from Accurate.');
    }
  }

  async isConnected(): Promise<boolean> {
    const tokenCount = await this.prisma.accurateOAuth.count();
    return tokenCount > 0;
  }
  
  private async refreshAccessToken(token: AccurateOAuth): Promise<AccurateOAuth> {
    this.logger.log('Token is expiring, attempting to refresh...');
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', token.refreshToken);
        
        const authHeader = Buffer.from(
            `${this.clientId}:${this.clientSecret}`,
        ).toString('base64');

        const response = await axios.post(this.tokenUrl, params, {
            headers: {
                Authorization: `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const { access_token, expires_in } = response.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        const updatedToken = await this.prisma.accurateOAuth.update({
            where: { id: token.id },
            data: { accessToken: access_token, expiresAt },
        });

        this.logger.log('✅ Access token refreshed successfully.');
        return updatedToken;
    } catch (error) {
        this.logger.error('🔴 Failed to refresh access token', error.response?.data);
        throw new Error('Failed to refresh token.');
    }
  }

  private async getValidToken(): Promise<AccurateOAuth | null> {
    const token = await this.prisma.accurateOAuth.findFirst();
    if (!token) return null;

    if (new Date(token.expiresAt.getTime() - 5 * 60 * 1000) < new Date()) {
      return this.refreshAccessToken(token);
    }
    return token;
  }

  public async getAccurateApiClient() {
    const token = await this.getValidToken();
    if (!token) {
      throw new Error('Accurate integration is not configured.');
    }

    return axios.create({
      baseURL: this.apiUrl,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    });
  }
}