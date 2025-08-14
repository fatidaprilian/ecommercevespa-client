// vespa-ecommerce-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

// --- Core Application Modules ---
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'; // <-- PERBAIKAN DI SINI

// --- Feature Modules ---
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { XenditModule } from './xendit/xendit.module';
import { UploadModule } from './upload/upload.module';
import { CartModule } from './cart/cart.module'; 
import { ShippingModule } from './shipping/shipping.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    // Konfigurasi Environment Variables secara Global
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().required(),
        FRONTEND_URL: Joi.string().uri().required(),
        XENDIT_API_KEY: Joi.string().required(),
        XENDIT_WEBHOOK_TOKEN: Joi.string().required(),
        RAJAONGKIR_API_KEY: Joi.string().required(),
      }),
    }),
    // Modul Inti
    PrismaModule,
    AuthModule,
    // Modul Fitur
    UsersModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    OrdersModule,
    PaymentsModule,
    XenditModule,
    UploadModule,
    CartModule,
    ShippingModule,
    AddressesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Menjadikan JwtAuthGuard sebagai guard default untuk seluruh aplikasi
    // Anda bisa menambahkan decorator @Public() pada route yang tidak memerlukan otentikasi
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}