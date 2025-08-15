// file: vespa-ecommerce-api/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core'; // APP_GUARD masih diimpor, tapi tidak digunakan untuk JwtAuthGuard

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
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'; // Tetap impor untuk referensi

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
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
    // --- PERBAIKAN UTAMA DI SINI ---
    // Hapus blok provider untuk JwtAuthGuard dari sini.
    // Dengan menghapus ini, guard tidak lagi diterapkan secara global.
    // Otentikasi sekarang akan ditangani di level controller/route secara spesifik
    // dengan decorator @UseGuards(JwtAuthGuard) atau @UseGuards(AuthGuard('jwt')).
    /*
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    */
  ],
})
export class AppModule {}