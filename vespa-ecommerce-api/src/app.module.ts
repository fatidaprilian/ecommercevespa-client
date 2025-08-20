import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Impor semua modul fitur Anda
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';
import { PaymentsModule } from './payments/payments.module';
import { ShippingModule } from './shipping/shipping.module';
import { UploadModule } from './upload/upload.module';
import { MidtransModule } from './midtrans/midtrans.module';
import { AddressesModule } from './addresses/addresses.module';
import { DiscountsModule } from './discounts/discounts.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { SettingsModule } from './settings/settings.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AccurateModule } from './accurate/accurate.module';
import { AccurateSyncModule } from './accurate-sync/accurate-sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (config) => {
        const requiredKeys = [
          'DATABASE_URL',
          'JWT_SECRET',
          'JWT_EXPIRES_IN',
          'FRONTEND_URL',
          'ADMIN_URL',
          'REDIS_HOST',
          'REDIS_PORT',
          'MIDTRANS_SERVER_KEY',
          'MIDTRANS_CLIENT_KEY',
          'CLOUDINARY_CLOUD_NAME',
          'CLOUDINARY_API_KEY',
          'CLOUDINARY_API_SECRET',
          'BITESHIP_API_KEY',
          'ACCURATE_CLIENT_ID',
          'ACCURATE_CLIENT_SECRET',
          'ACCURATE_REDIRECT_URI',
          'ACCURATE_AUTH_URL',
          'ACCURATE_TOKEN_URL',
          'ACCURATE_API_BASE_URL'
        ];

        for (const key of requiredKeys) {
          if (!config[key]) {
            throw new Error(`FATAL ERROR: Environment variable "${key}" is missing.`);
          }
        }
        return config;
      },
    }),
    
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST')!, // <-- Tambahkan '!'
          port: parseInt(configService.get('REDIS_PORT')!, 10), // <-- Tambahkan '!' di sini
          password: configService.get('REDIS_PASSWORD'), // Password bisa opsional
        },
      }),
    }),

    PrismaModule,
    DiscountsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    OrdersModule,
    CartModule,
    PaymentsModule,
    ShippingModule,
    UploadModule,
    MidtransModule,
    AddressesModule,
    ShipmentsModule,
    SettingsModule,
    WebhooksModule,
    PaymentMethodsModule,
    AccurateModule,
    AccurateSyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}