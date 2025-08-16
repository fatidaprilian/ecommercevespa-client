// file: vespa-ecommerce-api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { XenditModule } from './xendit/xendit.module';
import { AddressesModule } from './addresses/addresses.module';
import { DiscountsModule } from './discounts/discounts.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    XenditModule,
    AddressesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // ✅ KUNCI PERBAIKAN: Pastikan JwtAuthGuard TIDAK terdaftar secara global di sini.
    // Dengan menghapusnya dari sini, kita bisa mengontrol otentikasi
    // di masing-masing controller menggunakan @UseGuards.
  ],
})
export class AppModule {}