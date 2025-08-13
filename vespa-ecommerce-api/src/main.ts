// file: vespa-ecommerce-api/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // --- Menggunakan FRONTEND_URL dan ADMIN_URL ---
  const frontendUrl = configService.get('FRONTEND_URL');
  const adminUrl = configService.get('ADMIN_URL');

  const allowedOrigins = [frontendUrl, adminUrl].filter(Boolean); // Filter out any undefined values

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  // ----------------------------------------------

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
  console.log(`✅ CORS enabled for origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();