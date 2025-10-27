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

  constructor(private configService: ConfigService) {
    this.senderName = this.configService.getOrThrow<string>('EMAIL_SENDER_NAME');
    this.senderEmail = this.configService.getOrThrow<string>('EMAIL_SENDER_ADDRESS');

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: this.configService.getOrThrow<string>('GMAIL_USER'),
        pass: this.configService.getOrThrow<string>('GMAIL_APP_PASSWORD'),
      },
    });
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
    const subject = 'Konfirmasi Pendaftaran Akun JakartaScooterShop Anda';
    const htmlContent = `
      <h1>Selamat Datang di JakartaScooterShop, ${name}!</h1>
      <p>Terima kasih telah mendaftar. Hanya satu langkah lagi untuk mengaktifkan akun Anda.</p>
      <p>Silakan masukkan kode verifikasi di bawah ini pada halaman pendaftaran:</p>
      <h2 style="font-size: 28px; letter-spacing: 4px; text-align: center; margin: 20px 0;">${token}</h2>
      <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
      <br>
      <p>Jika Anda tidak merasa mendaftar, abaikan email ini.</p>
      <p>Salam,<br>Tim JakartaScooterShop</p>
    `;
    await this.sendEmail({ email: to, name }, subject, htmlContent);
  }

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const subject = 'Permintaan Reset Password Akun JakartaScooterShop';
    const htmlContent = `
       <h1>Reset Password</h1>
       <p>Halo ${name},</p>
       <p>Kami menerima permintaan untuk mereset password akun Anda. Silakan masukkan kode di bawah ini pada halaman reset password:</p>
       <h2 style="font-size: 28px; letter-spacing: 4px; text-align: center; margin: 20px 0;">${token}</h2>
       <p>Kode ini akan kedaluwarsa dalam 10 menit.</p>
       <p>Jika Anda tidak merasa meminta ini, abaikan email ini.</p>
       <p>Salam,<br>Tim JakartaScooterShop</p>
   `;
    await this.sendEmail({ email: to, name }, subject, htmlContent);
  }
}