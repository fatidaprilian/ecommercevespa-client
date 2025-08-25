// file: vespa-ecommerce-api/src/accurate-sync/accurate-sync.processor.ts

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AccurateSyncService } from './accurate-sync.service';
import { Logger } from '@nestjs/common';

@Processor('accurate-sync-queue') 
export class AccurateSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(AccurateSyncProcessor.name);

    constructor(
        private readonly accurateSyncService: AccurateSyncService
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing job: ${job.name} - ID: ${job.id}`);
        
        try {
            switch (job.name) {
                case 'sync-products':
                    const result = await this.accurateSyncService.syncProductsFromAccurate();
                    this.logger.log(`Job ${job.name} completed successfully.`);
                    return result;
                
                case 'create-sales-order':
                    if (!job.data.orderId) {
                        throw new Error('Job "create-sales-order" is missing orderId.');
                    }
                    const soResult = await this.accurateSyncService.processSalesOrderCreation(job.data.orderId);
                    this.logger.log(`Job ${job.name} for Order ID ${job.data.orderId} completed successfully.`);
                    return soResult;

                default:
                    this.logger.warn(`No processor found for job name: ${job.name}`);
                    break;
            }
        } catch (error) {
            this.logger.error(`Job ${job.name} (ID: ${job.id}) failed.`, error.stack);
            throw error;
        }
    }
}