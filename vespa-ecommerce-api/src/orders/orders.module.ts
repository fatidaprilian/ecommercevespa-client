import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from 'src/payments/payments.module'; // Import PaymentsModule

@Module({
  imports: [PaymentsModule], // Tambahkan PaymentsModule di sini agar OrdersService bisa menggunakannya
  controllers: [OrdersController],
  providers: [OrdersService], 
})
export class OrdersModule {}
