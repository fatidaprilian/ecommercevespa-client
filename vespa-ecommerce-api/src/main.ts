// file: src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common'; // <-- Impor ValidationPipe

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());

  // TAMBAHKAN BARIS INI untuk mengaktifkan validasi otomatis di semua endpoint
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Otomatis menghapus properti yang tidak ada di DTO
    forbidNonWhitelisted: true, // Memberi error jika ada properti yang tidak terdaftar
    transform: true, // Otomatis mengubah tipe data (misal: string dari query param ke number)
  }));

  app.enableCors({
    origin: configService.get('FRONTEND_URL'),
    credentials: true,
  });

  await app.listen(3001);
}
bootstrap();