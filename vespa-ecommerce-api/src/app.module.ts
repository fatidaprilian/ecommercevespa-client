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
import { MidtransModule } from './midtrans/midtrans.module'; 
import { AddressesModule } from './addresses/addresses.module';
import { DiscountsModule } from './discounts/discounts.module'; 
import { ShipmentsModule } from './shipments/shipments.module';
import { SettingsModule } from './settings/settings.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';

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
    MidtransModule, 
    AddressesModule,
    ShipmentsModule,
    SettingsModule,
    PaymentMethodsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule {}