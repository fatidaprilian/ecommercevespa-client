import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosError } from 'axios';
import { URLSearchParams } from 'url';
import { AccurateOAuth } from '@prisma/client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class AccurateService {
    private readonly logger = new Logger(AccurateService.name);

    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly redirectUri: string;
    private readonly authUrl: string;
    private readonly tokenUrl: string;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) {
        this.clientId = this.configService.get<string>('ACCURATE_CLIENT_ID') || '';
        this.clientSecret = this.configService.get<string>('ACCURATE_CLIENT_SECRET') || '';
        this.redirectUri = this.configService.get<string>('ACCURATE_REDIRECT_URI') || '';
        this.authUrl = this.configService.get<string>('ACCURATE_AUTH_URL') || '';
        this.tokenUrl = this.configService.get<string>('ACCURATE_TOKEN_URL') || '';
    }

    getAuthorizationUrl(): string {
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: 'item_view item_save sales_invoice_view sales_invoice_save customer_view customer_save branch_view sales_receipt_view sales_receipt_save glaccount_view sales_order_save sales_order_view',
        });
        return `${this.authUrl}?${params.toString()}`;
    }

    async handleCallback(code: string): Promise<void> {
        try {
            const params = new URLSearchParams();
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('redirect_uri', this.redirectUri);
            const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
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
            throw new Error('Gagal mendapatkan token dari Accurate.');
        }
    }

    async isConnected(): Promise<{ connected: boolean; dbSelected: boolean }> {
        const tokenInfo = await this.prisma.accurateOAuth.findFirst();
        const isConnected = !!tokenInfo;
        const isDbSelected = !!tokenInfo?.dbId;
        return { connected: isConnected, dbSelected: isDbSelected };
    }

    private async getValidToken(): Promise<AccurateOAuth | null> {
        const token = await this.prisma.accurateOAuth.findFirst();
        if (!token) return null;
        if (new Date(token.expiresAt.getTime() - 5 * 60 * 1000) < new Date()) {
            return this.refreshAccessToken(token);
        }
        return token;
    }
    
    private async refreshAccessToken(token: AccurateOAuth): Promise<AccurateOAuth> {
        this.logger.log('Token is expiring, attempting to refresh...');
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', token.refreshToken);
            const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
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
            throw new Error('Gagal me-refresh token.');
        }
    }

    async getDatabaseList() {
        this.logger.log('Fetching database list from Accurate...');
        const token = await this.getValidToken();
        if (!token) throw new Error('Not authenticated with Accurate.');
        const response = await axios.get('https://account.accurate.id/api/db-list.do', {
            headers: { Authorization: `Bearer ${token.accessToken}` },
        });
        return response.data.d;
    }

    async openDatabase(dbId: string) {
        this.logger.log(`Opening Accurate database with ID: ${dbId}`);
        const token = await this.getValidToken();
        if (!token) throw new Error('Not authenticated with Accurate.');
        const openDbResponse = await axios.get('https://account.accurate.id/api/open-db.do', {
            params: { id: dbId },
            headers: { Authorization: `Bearer ${token.accessToken}` },
        });
        const { host, session } = openDbResponse.data;
        if (!host || !session) {
            throw new InternalServerErrorException('Gagal mendapatkan host atau session dari Accurate.');
        }
        this.logger.log(`Successfully opened database. Host: ${host}`);
        const branchApiClient = axios.create({
            baseURL: host,
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'X-Session-ID': session,
            },
        });
        const branchResponse = await branchApiClient.get('/accurate/api/branch/list.do', {
            params: { fields: 'name' }
        });
        if (!branchResponse.data.d || branchResponse.data.d.length === 0) {
            throw new InternalServerErrorException('Tidak ada cabang yang ditemukan di database Accurate ini.');
        }
        const firstBranchName = branchResponse.data.d[0].name;
        this.logger.log(`Default branch found: ${firstBranchName}`);
        await this.prisma.accurateOAuth.updateMany({
            data: { 
                dbId, 
                dbHost: host, 
                dbSession: session,
                branchName: firstBranchName
            },
        });
        return { message: 'Database selected and default branch stored successfully' };
    }

    public async getAccurateApiClient() {
        const token = await this.getValidToken();
        if (!token) {
            throw new InternalServerErrorException('Integrasi Accurate tidak dikonfigurasi.');
        }
        const dbInfo = await this.prisma.accurateOAuth.findFirst();
        if (!dbInfo || !dbInfo.dbHost || !dbInfo.dbSession) {
            throw new InternalServerErrorException('Database Accurate belum dipilih atau dibuka.');
        }
        return axios.create({
            baseURL: dbInfo.dbHost,
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'X-Session-ID': dbInfo.dbSession,
            },
        });
    }

    public async getSalesInvoiceByNumber(invoiceNumber: string): Promise<any | null> {
        const MAX_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                this.logger.log(`[Attempt ${attempt}/${MAX_RETRIES}] Mencari Sales Invoice dengan NOMOR: ${invoiceNumber}`);
                const apiClient = await this.getAccurateApiClient();
                const response = await apiClient.get('/accurate/api/sales-invoice/detail.do', { 
                    params: { 
                        number: invoiceNumber 
                    }
                });

                // DEBUG: Log raw response
                this.logger.log(`=== RAW API RESPONSE for Sales Invoice ${invoiceNumber} ===`);
                this.logger.log(`Response Status: ${response.status}`);
                this.logger.log(`Response Data:`, JSON.stringify(response.data, null, 2));

                if (response.data?.s && response.data?.d) {
                    const invoiceData = response.data.d;
                    
                    // DEBUG: Log struktur detail
                    this.logger.log(`=== INVOICE DETAIL ANALYSIS ===`);
                    this.logger.log(`Invoice ID: ${invoiceData.id}`);
                    this.logger.log(`Invoice Number: ${invoiceData.number}`);
                    this.logger.log(`Available top-level fields:`, Object.keys(invoiceData));
                    
                    // Log field yang mungkin berisi Sales Order reference
                    const possibleSOFields = ['fromNumber', 'refNumber', 'orderNumber', 'salesOrderNo', 'soNumber', 'reference'];
                    possibleSOFields.forEach(field => {
                        if (invoiceData[field]) {
                            this.logger.log(`Found SO reference field '${field}': ${invoiceData[field]}`);
                        }
                    });
                    
                    return invoiceData;
                }
                
                this.logger.warn(`API returned unsuccessful response for invoice ${invoiceNumber}:`, response.data);
                return null;
            } catch (error) {
                const axiosError = error as AxiosError;
                if (axiosError.code === 'EAI_AGAIN' && attempt < MAX_RETRIES) {
                    this.logger.warn(`Network error (EAI_AGAIN) saat mencari invoice. Mencoba lagi dalam 2 detik...`);
                    await delay(2000);
                    continue;
                }
                
                this.logger.error(`Error saat getSalesInvoiceByNumber: ${error.message}`, axiosError.response?.data);
                if (error.response?.data) {
                    this.logger.error(`Full error response:`, JSON.stringify(error.response.data, null, 2));
                }
                return null;
            }
        }
        return null;
    }
    
    public async getSalesReceiptDetailByNumber(receiptNumber: string): Promise<any | null> {
        try {
            this.logger.log(`Fetching Sales Receipt detail for number: ${receiptNumber}`);
            const apiClient = await this.getAccurateApiClient();
            
            const response = await apiClient.get('/accurate/api/sales-receipt/detail.do', { 
                params: { number: receiptNumber }
            });

            // DEBUG: Log raw response
            this.logger.log(`=== RAW API RESPONSE for Sales Receipt ${receiptNumber} ===`);
            this.logger.log(`Response Status: ${response.status}`);
            this.logger.log(`Response Data:`, JSON.stringify(response.data, null, 2));

            if (response.data?.s && response.data?.d) {
                const receiptData = response.data.d;
                
                // DEBUG: Log struktur detail
                this.logger.log(`=== RECEIPT DETAIL ANALYSIS ===`);
                this.logger.log(`Receipt ID: ${receiptData.id}`);
                this.logger.log(`Receipt Number: ${receiptData.number}`);
                this.logger.log(`Available top-level fields:`, Object.keys(receiptData));
                
                // Periksa semua field yang mungkin berisi detail invoice
                if (receiptData.detailInvoice) {
                    this.logger.log(`detailInvoice type: ${Array.isArray(receiptData.detailInvoice) ? 'array' : typeof receiptData.detailInvoice}`);
                    if (Array.isArray(receiptData.detailInvoice)) {
                        this.logger.log(`detailInvoice length: ${receiptData.detailInvoice.length}`);
                        receiptData.detailInvoice.forEach((invoice, index) => {
                            this.logger.log(`detailInvoice[${index}]:`, JSON.stringify(invoice, null, 2));
                        });
                    } else {
                        this.logger.log(`detailInvoice (object):`, JSON.stringify(receiptData.detailInvoice, null, 2));
                    }
                }
                
                if (receiptData.detail) {
                    this.logger.log(`detail type: ${Array.isArray(receiptData.detail) ? 'array' : typeof receiptData.detail}`);
                    if (Array.isArray(receiptData.detail)) {
                        this.logger.log(`detail length: ${receiptData.detail.length}`);
                        receiptData.detail.forEach((item, index) => {
                            this.logger.log(`detail[${index}]:`, JSON.stringify(item, null, 2));
                        });
                    }
                }
                
                if (receiptData.items) {
                    this.logger.log(`items found:`, JSON.stringify(receiptData.items, null, 2));
                }
                
                return receiptData;
            }
            
            this.logger.warn(`API returned unsuccessful response for receipt ${receiptNumber}:`, response.data);
            return null;
        } catch (error) {
            this.logger.error(`Error fetching Sales Receipt detail for ${receiptNumber}:`, error.response?.data || error.message);
            if (error.response?.data) {
                this.logger.error(`Full error response:`, JSON.stringify(error.response.data, null, 2));
            }
            return null;
        }
    }

    async getBankAccounts() {
        this.logger.log('Fetching Cash & Bank GL Accounts from Accurate...');
        try {
            const apiClient = await this.getAccurateApiClient();
            const response = await apiClient.get('/accurate/api/glaccount/list.do', {
                params: {
                    'sp.type': 'CASH_BANK',
                    fields: 'id,no,name,accountType',
                },
            });
            if (!response.data.s || !response.data.d) {
                this.logger.warn('No bank accounts found in Accurate or API error.');
                return [];
            }
            return response.data.d.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            this.logger.error('Failed to fetch bank accounts from Accurate', error.response?.data || error.message);
            throw new InternalServerErrorException('Gagal mengambil daftar akun bank dari Accurate.');
        }
    }

    async renewWebhook(): Promise<void> {
        this.logger.log('Attempting to renew Accurate webhook...');
        try {
            const apiClient = await this.getAccurateApiClient();
            const response = await apiClient.post('/accurate/api/webhook-renew.do');

            if (response.data?.s) {
                this.logger.log(`✅ Accurate webhook successfully renewed. Active for 7 more days.`);
            } else {
                const errorMessage = response.data?.d?.[0] || 'Unknown error during webhook renewal.';
                this.logger.warn(`Could not renew Accurate webhook: ${errorMessage}`);
            }
        } catch (error) {
            this.logger.error('Failed to call Accurate renew webhook API', error.response?.data || error.message);
        }
    }
}