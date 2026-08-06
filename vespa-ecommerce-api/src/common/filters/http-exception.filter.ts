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
    // Extract original response payload from exception
    const errorResponse = exception.getResponse();

    let message: string | string[];

    // Extract human-readable error message:
    if (typeof errorResponse === 'string') {
      // String error response
      message = errorResponse;
    } else if (
      typeof errorResponse === 'object' &&
      errorResponse !== null &&
      'message' in errorResponse
    ) {
      // Object response from ValidationPipe or built-in NestJS HttpExceptions
      message = (errorResponse as any).message;
    } else {
      // Fallback message if format is unrecognized
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
      message: message, // Return extracted message payload
    });
  }
}