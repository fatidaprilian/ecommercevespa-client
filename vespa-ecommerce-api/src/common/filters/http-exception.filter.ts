// src/common/filters/http-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    // Dapatkan respons asli dari exception
    const errorResponse = exception.getResponse();

    let message: string | string[];

    // Logika untuk mengekstrak pesan:
    if (typeof errorResponse === 'string') {
      // Jika responsnya hanya string (jarang terjadi untuk exception bawaan)
      message = errorResponse;
    } else if (
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse // Cek apakah ada properti 'message'
    ) {
      // Jika responsnya objek (umumnya dari ValidationPipe atau exception bawaan seperti ConflictException)
      // Ambil 'message'. Ini bisa berupa string atau array string (dari ValidationPipe)
      message = (errorResponse as any).message;
    } else {
      // Fallback jika format tidak dikenali, gunakan pesan default berdasarkan status
      message = exception.message || HttpStatus[status] || 'Internal server error';
    }

    // Log using NestJS Logger (structured, without leaking to client)
    this.logger.error(
      `Status: ${status}, Path: ${request.method} ${request.url}, Message: ${JSON.stringify(message)}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message, // Kirim message yang sudah diekstrak
    });
  }
}