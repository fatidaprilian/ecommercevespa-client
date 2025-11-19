// File: src/accurate/accurate.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
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
            scope: 'item_view item_save sales_invoice_view sales_invoice_save customer_view customer_save branch_view sales_receipt_view sales_receipt_save glaccount_view sales_order_save sales_order_view item_adjustment_save sellingprice_adjustment_view',
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
            this.logger.log('✅ Berhasil menyimpan token OAuth Accurate.');
        } catch (error) {
            this.logger.error('🔴 Gagal menukar kode dengan token', error.response?.data || error.message);
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
        this.logger.log('Token akan kedaluwarsa, mencoba me-refresh...');
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
            this.logger.log('✅ Access token berhasil di-refresh.');
            return updatedToken;
        } catch (error) {
            this.logger.error('🔴 Gagal me-refresh access token', error.response?.data);
            throw new Error('Gagal me-refresh token.');
        }
    }

    async getDatabaseList() {
        this.logger.log('Mengambil daftar database dari Accurate...');
        const token = await this.getValidToken();
        if (!token) throw new Error('Belum terautentikasi dengan Accurate.');
        const response = await axios.get('https://account.accurate.id/api/db-list.do', {
            headers: { Authorization: `Bearer ${token.accessToken}` },
        });
        return response.data.d;
    }

    async openDatabase(dbId: string) {
        this.logger.log(`Membuka database Accurate dengan ID: ${dbId}`);
        const token = await this.getValidToken();
        if (!token) throw new Error('Belum terautentikasi dengan Accurate.');
        const openDbResponse = await axios.get('https://account.accurate.id/api/open-db.do', {
            params: { id: dbId },
            headers: { Authorization: `Bearer ${token.accessToken}` },
        });
        const { host, session } = openDbResponse.data;
        if (!host || !session) {
            throw new InternalServerErrorException('Gagal mendapatkan host atau session dari Accurate.');
        }
        this.logger.log(`Berhasil membuka database. Host: ${host}`);
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
        this.logger.log(`Cabang default ditemukan: ${firstBranchName}`);
        await this.prisma.accurateOAuth.updateMany({
            data: { 
                dbId, 
                dbHost: host, 
                dbSession: session,
                branchName: firstBranchName
            },
        });
        return { message: 'Database berhasil dipilih dan cabang default berhasil disimpan.' };
    }

// [REVISI LENGKAP] Method getAccurateApiClient dengan Auto-Fix Host & Redirect Handler
    public async getAccurateApiClient(): Promise<AxiosInstance> {
        const token = await this.getValidToken();
        if (!token) {
            throw new InternalServerErrorException('Integrasi Accurate tidak dikonfigurasi.');
        }

        // Ambil info database terbaru
        const dbInfo = await this.prisma.accurateOAuth.findFirst();
        if (!dbInfo || !dbInfo.dbHost || !dbInfo.dbSession) {
            throw new InternalServerErrorException('Database Accurate belum dipilih atau dibuka.');
        }

        // 1. Buat Instance Axios dengan konfigurasi khusus Redirect
        const instance = axios.create({
            baseURL: dbInfo.dbHost,
            headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'X-Session-ID': dbInfo.dbSession,
            },
            // [PENTING] Izinkan redirect dan paksa header Authorization tetap ikut
            maxRedirects: 5,
            beforeRedirect: (options) => {
                // Pasang kembali header saat redirect terjadi (fix issue 308)
                options.headers['Authorization'] = `Bearer ${token.accessToken}`;
                options.headers['X-Session-ID'] = dbInfo.dbSession;
            },
        });

        // 2. [REKOMENDASI] Tambahkan Interceptor untuk menangani perubahan Host secara Otomatis
        instance.interceptors.response.use(
            (response) => response,
            async (error) => {
                // Cek apakah response memiliki data endpoint baru (biasanya pada status 308 atau 401)
                // Accurate mengirim JSON: { "error": "...", "endpoint": "https://..." }
                if (error.response && error.response.data && error.response.data.endpoint) {
                    const newEndpoint = error.response.data.endpoint;
                    
                    // Cek apakah endpoint benar-benar baru/berbeda dari yang kita punya
                    if (newEndpoint && newEndpoint !== dbInfo.dbHost) {
                        this.logger.warn(
                            `[AUTO-FIX] Mendeteksi perubahan host Accurate dari '${dbInfo.dbHost}' ke '${newEndpoint}'. Memperbarui database dan mencoba ulang request...`
                        );

                        // A. Update database lokal agar request berikutnya langsung benar
                        await this.prisma.accurateOAuth.updateMany({
                            data: { dbHost: newEndpoint }
                        });

                        // B. Update konfigurasi request yang gagal ini dengan host baru
                        const originalRequest = error.config;
                        originalRequest.baseURL = newEndpoint;
                        originalRequest.headers['Authorization'] = `Bearer ${token.accessToken}`;
                        originalRequest.headers['X-Session-ID'] = dbInfo.dbSession;

                        // C. Retry request original dengan config baru
                        return axios.request(originalRequest);
                    }
                }

                // Jika bukan error perubahan host, lempar error seperti biasa
                return Promise.reject(error);
            }
        );

        return instance;
    }
    
    public async getSalesInvoiceByNumber(invoiceNumber: string): Promise<any | null> {
        try {
            this.logger.log(`Mengambil detail Faktur Penjualan untuk nomor: ${invoiceNumber}`);
            const apiClient = await this.getAccurateApiClient();
            
            const response = await apiClient.get('/accurate/api/sales-invoice/detail.do', { 
                params: {
                    number: invoiceNumber
                }
            });

            if (response.data?.s && response.data.d) {
                return response.data.d;
            }
            
            this.logger.warn(`Tidak ada Faktur Penjualan ditemukan dengan nomor: ${invoiceNumber} menggunakan /detail.do`);
            return null;
        } catch (error) {
            this.logger.error(`Error mengambil detail Faktur Penjualan untuk ${invoiceNumber}:`, error.response?.data || error.message);
            return null;
        }
    }
    
    public async getSalesReceiptDetailByNumber(receiptNumber: string): Promise<any | null> {
        try {
            this.logger.log(`Mengambil detail Penerimaan Penjualan untuk nomor: ${receiptNumber}`);
            const apiClient = await this.getAccurateApiClient();
            
            const response = await apiClient.get('/accurate/api/sales-receipt/detail.do', { 
                params: { number: receiptNumber }
            });

            if (response.data?.s && response.data?.d) {
                return response.data.d;
            }
            return null;
        } catch (error) {
            this.logger.error(`Error mengambil detail Penerimaan Penjualan untuk ${receiptNumber}:`, error.response?.data || error.message);
            return null;
        }
    }

    async getBankAccounts() {
        this.logger.log('Mengambil daftar Akun Kas & Bank dari Accurate...');
        try {
            const apiClient = await this.getAccurateApiClient();
            const response = await apiClient.get('/accurate/api/glaccount/list.do', {
                params: {
                    'sp.type': 'CASH_BANK',
                    fields: 'id,no,name,accountType',
                },
            });
            if (!response.data.s || !response.data.d) {
                this.logger.warn('Tidak ada akun bank ditemukan di Accurate atau terjadi error API.');
                return [];
            }
            return response.data.d.sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            this.logger.error('Gagal mengambil daftar akun bank dari Accurate', error.response?.data || error.message);
            throw new InternalServerErrorException('Gagal mengambil daftar akun bank dari Accurate.');
        }
    }

    async renewWebhook(): Promise<void> {
        this.logger.log('Mencoba memperbarui webhook Accurate...');
        try {
            const token = await this.getValidToken();
            if (!token) {
                this.logger.error('Tidak dapat memperbarui webhook karena tidak ada token yang valid.');
                return;
            }

            const response = await axios.get('https://account.accurate.id/api/webhook-renew.do', {
                headers: {
                    'Authorization': `Bearer ${token.accessToken}`
                }
            });

            if (response.data?.s) {
                this.logger.log(`✅ Webhook Accurate berhasil diperbarui. Aktif untuk 7 hari ke depan.`);
            } else {
                const errorMessage = response.data?.d?.[0] || 'Error tidak diketahui saat perpanjangan webhook.';
                this.logger.warn(`Tidak dapat memperbarui webhook Accurate: ${errorMessage}`);
            }
        } catch (error) {
            this.logger.error('Gagal memanggil API perpanjangan webhook Accurate', error.response?.data || error.message);
        }
    }

    async disconnect(): Promise<{ message: string }> {
        this.logger.log('Disconnecting from Accurate by deleting OAuth tokens...');
        const deleteResult = await this.prisma.accurateOAuth.deleteMany({});
        
        if (deleteResult.count > 0) {
            this.logger.log('✅ Successfully disconnected from Accurate.');
            return { message: 'Berhasil memutuskan koneksi dari Accurate.' };
        } else {
            this.logger.warn('Attempted to disconnect, but no active connection was found.');
            return { message: 'Tidak ada koneksi aktif yang ditemukan.' };
        }
    }
}