import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Xendit from 'xendit-node';

@Injectable()
export class XenditService {
  private readonly xenditClient: Xendit;

  constructor(private configService: ConfigService) {
    const xenditKey = this.configService.get<string>('XENDIT_API_KEY');
    if (!xenditKey) {
      throw new Error(
        'XENDIT_API_KEY tidak terdefinisi di environment variables',
      );
    }
    this.xenditClient = new Xendit({
      secretKey: xenditKey,
    });
  }

  /**
   * Membuat invoice di Xendit menggunakan API asli.
   * @param invoiceData - Data yang dibutuhkan untuk membuat invoice (camelCase).
   * @returns Objek response dari API Xendit.
   */
  async createInvoice(invoiceData: {
    // --- PERBAIKAN FINAL ADA DI SINI ---
    externalId: string; // Menggunakan camelCase sesuai tipe data
    amount: number;
    payerEmail: string; // Menggunakan camelCase sesuai tipe data
    description: string;
  }) {
    try {
      const invoiceClient = this.xenditClient.Invoice;

      console.log(
        `Mencoba membuat invoice untuk external_id: ${invoiceData.externalId}`,
      );

      // Kirim data ke Xendit
      const response = await invoiceClient.createInvoice({
        data: invoiceData,
      });

      console.log(`Invoice berhasil dibuat: ${response.id}`);
      return response;

    } catch (error) {
      console.error('Gagal membuat invoice Xendit:', error.message || error);
      throw new InternalServerErrorException(
        'Gagal memproses pembayaran dengan Xendit',
      );
    }
  }

  /**
   * Memvalidasi callback token dari webhook Xendit.
   * @param token - Token yang diterima dari header 'x-callback-token'.
   */
  validateCallbackToken(token: string) {
    const expectedToken = this.configService.get<string>(
      'XENDIT_WEBHOOK_TOKEN',
    );
    if (!expectedToken || token !== expectedToken) {
      throw new UnauthorizedException('Token callback tidak valid');
    }
  }
}