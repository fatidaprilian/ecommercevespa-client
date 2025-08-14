import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  // Impor PrismaModule agar BrandsService bisa menggunakannya
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  // Export BrandsService agar bisa digunakan oleh modul lain (misalnya ProductsModule)
  exports: [BrandsService], 
})
export class BrandsModule {}