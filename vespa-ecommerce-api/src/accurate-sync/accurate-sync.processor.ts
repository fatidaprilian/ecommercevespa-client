import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AccurateSyncService } from './accurate-sync.service';
import { Logger } from '@nestjs/common';

@Processor('accurate-sync-queue') // Mendengarkan antrean dengan nama ini
export class AccurateSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(AccurateSyncProcessor.name);

    constructor(
        private readonly accurateSyncService: AccurateSyncService
    ) {
        super();
    }

    // Fungsi ini akan otomatis dipanggil ketika ada job baru dari antrean
    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing job: ${job.name} - ID: ${job.id}`);
        
        switch (job.name) {
            case 'sync-products':
                try {
                    const result = await this.accurateSyncService.syncProductsFromAccurate();
                    this.logger.log(`Job ${job.name} completed successfully.`);
                    return result;
                } catch (error) {
                    this.logger.error(`Job ${job.name} failed.`, error.stack);
                    throw error; // Melempar error agar BullMQ bisa mencoba lagi (retry)
                }
            
            // Anda bisa menambahkan 'case' lain di sini untuk pekerjaan berbeda
            // case 'create-invoice':
            //   const orderId = job.data.orderId;
            //   return await this.accurateSyncService.createSalesInvoice(orderId);

            default:
                this.logger.warn(`No processor found for job name: ${job.name}`);
                break;
        }
    }
}