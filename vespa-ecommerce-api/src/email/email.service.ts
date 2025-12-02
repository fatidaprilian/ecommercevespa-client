// file: src/email/email.service.ts

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly senderName: string;
  private readonly senderEmail: string;

  // Warna Brand Jakarta Scooter Shop
  private readonly brandColor = '#f04e23';
  private readonly grayColor = '#52616B';

  constructor(private configService: ConfigService) {
    this.senderName = this.configService.getOrThrow<string>('EMAIL_SENDER_NAME');
    this.senderEmail = this.configService.getOrThrow<string>('EMAIL_SENDER_ADDRESS');

    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: this.configService.getOrThrow<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE', true),
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
  }

  /**
   * Fungsi helper untuk membungkus konten email dengan Template HTML Standar
   */
  private getEmailTemplate(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
          .header { background-color: #1E2022; padding: 20px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px; }
          .content { padding: 30px 20px; color: #333333; line-height: 1.6; }
          .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; }
          .button { display: inline-block; background-color: ${this.brandColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
          .otp-box { background-color: #f0f5f9; border: 2px dashed ${this.grayColor}; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: ${this.brandColor}; margin: 20px 0; border-radius: 8px; }
          .highlight { color: ${this.brandColor}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>JAKARTA SCOOTER SHOP</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Jakarta Scooter Shop. All rights reserved.</p>
            <p>Email ini dikirim secara otomatis, mohon jangan membalas.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  public async sendEmail(to: { email: string; name: string }, subject: string, htmlContent: string) {
    const mailOptions = {
      from: `"${this.senderName}" <${this.senderEmail}>`,
      to: to.email,
      subject: subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to.email}`, error);
      throw new InternalServerErrorException('Gagal mengirim email.');
    }
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const subject = 'Verifikasi Akun Jakarta Scooter Shop';
    
    const content = `
      <h2 style="margin-top: 0;">Halo, ${name}! 👋</h2>
      <p>Terima kasih telah mendaftar di <strong>Jakarta Scooter Shop</strong>. Untuk mengamankan akun Anda dan mulai berbelanja sparepart Vespa terbaik, silakan verifikasi email Anda.</p>
      
      <p>Gunakan kode OTP berikut untuk menyelesaikan pendaftaran:</p>
      
      <div class="otp-box">${token}</div>
      
      <p style="font-size: 14px; color: #666;">⚠️ Kode ini hanya berlaku selama <strong>10 menit</strong>. Jangan berikan kode ini kepada siapa pun.</p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
      
      <p style="font-size: 13px; color: #888;">Jika Anda tidak merasa mendaftar di website kami, silakan abaikan email ini.</p>
    `;

    const html = this.getEmailTemplate(subject, content);
    await this.sendEmail({ email: to, name }, subject, html);
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const subject = 'Permintaan Reset Password';
    
    const content = `
      <h2 style="margin-top: 0;">Permintaan Reset Password 🔒</h2>
      <p>Halo ${name}, kami menerima permintaan untuk mereset kata sandi akun Jakarta Scooter Shop Anda.</p>
      
      <p>Gunakan kode di bawah ini untuk membuat kata sandi baru:</p>
      
      <div class="otp-box">${token}</div>
      
      <p style="font-size: 14px; color: #666;">⚠️ Kode ini berlaku selama <strong>10 menit</strong>.</p>
      
      <p>Jika Anda tidak meminta reset password, keamanan akun Anda mungkin terancam. Segera hubungi kami atau abaikan email ini.</p>
    `;

    const html = this.getEmailTemplate(subject, content);
    await this.sendEmail({ email: to, name }, subject, html);
  }
}