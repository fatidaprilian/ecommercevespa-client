// file: vespa-ecommerce-api/src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary'; // <-- 1. IMPORT CLOUDINARY

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // --- 2. KONFIGURASI CLOUDINARY ---
  cloudinary.config({
    cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
    api_key: configService.get('CLOUDINARY_API_KEY'),
    api_secret: configService.get('CLOUDINARY_API_SECRET'),
  });
  // ------------------------------------

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = configService.get('FRONTEND_URL');
  const adminUrl = configService.get('ADMIN_URL');
  const allowedOrigins = [frontendUrl, adminUrl].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
  console.log(`✅ CORS enabled for origins: ${allowedOrigins.join(', ')}`);
  console.log('✅ Cloudinary successfully configured!'); // <-- 3. TAMBAHKAN LOG SUKSES
}
bootstrap();