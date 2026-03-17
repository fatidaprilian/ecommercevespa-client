import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { AccurateService } from '../accurate/accurate.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccurateSyncService } from './accurate-sync.service';

describe('AccurateSyncService', () => {
  let service: AccurateSyncService;
  let prismaMock: {
    order: {
      findMany: jest.Mock;
    };
  };
  let queueMock: {
    getJob: jest.Mock;
    add: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      order: {
        findMany: jest.fn(),
      },
    };

    queueMock = {
      getJob: jest.fn(),
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccurateSyncService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AccurateService,
          useValue: {},
        },
        {
          provide: getQueueToken('accurate-sync-queue'),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get<AccurateSyncService>(AccurateSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should enqueue product sync when singleton job does not exist', async () => {
    queueMock.getJob.mockResolvedValue(null);

    await service.scheduleProductSync();

    expect(queueMock.add).toHaveBeenCalledWith(
      'sync-products',
      {},
      {
        jobId: 'sync-products-singleton',
        removeOnComplete: true,
        removeOnFail: 10,
      },
    );
  });

  it('should skip enqueue when singleton job is still active', async () => {
    const existingJobMock = {
      id: 'existing-active-job',
      processedOn: Date.now(),
      getState: jest.fn().mockResolvedValue('active'),
      remove: jest.fn(),
    };
    queueMock.getJob.mockResolvedValue(existingJobMock);

    await service.scheduleProductSync();

    expect(existingJobMock.remove).not.toHaveBeenCalled();
    expect(queueMock.add).not.toHaveBeenCalled();
  });

  it('should replace failed singleton job before enqueueing a new one', async () => {
    const existingJobMock = {
      id: 'existing-failed-job',
      processedOn: null,
      timestamp: Date.now(),
      getState: jest.fn().mockResolvedValue('failed'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    queueMock.getJob.mockResolvedValue(existingJobMock);

    await service.scheduleProductSync();

    expect(existingJobMock.remove).toHaveBeenCalledTimes(1);
    expect(queueMock.add).toHaveBeenCalledWith(
      'sync-products',
      {},
      {
        jobId: 'sync-products-singleton',
        removeOnComplete: true,
        removeOnFail: 10,
      },
    );
  });

  it('should enqueue sales-order job with retry policy', async () => {
    await service.addSalesOrderJobToQueue('order-123');

    expect(queueMock.add).toHaveBeenCalledWith(
      'create-sales-order',
      { orderId: 'order-123' },
      {
        jobId: 'create-sales-order:order-123',
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );
  });

  it('should not requeue recovery jobs when no pending reseller orders exist', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);
    const addSalesOrderJobSpy = jest.spyOn(service, 'addSalesOrderJobToQueue');

    await service.scheduleSalesOrderRecovery();

    expect(prismaMock.order.findMany).toHaveBeenCalledTimes(1);
    expect(addSalesOrderJobSpy).not.toHaveBeenCalled();
  });

  it('should requeue reseller orders without accurate sales order during recovery', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: 'order-1',
        orderNumber: 'ORD-001',
        createdAt: new Date('2026-03-13T12:00:00.000Z'),
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-002',
        createdAt: new Date('2026-03-13T12:05:00.000Z'),
      },
    ]);
    const addSalesOrderJobSpy = jest
      .spyOn(service, 'addSalesOrderJobToQueue')
      .mockResolvedValue(undefined);

    await service.scheduleSalesOrderRecovery();

    expect(addSalesOrderJobSpy).toHaveBeenNthCalledWith(1, 'order-1');
    expect(addSalesOrderJobSpy).toHaveBeenNthCalledWith(2, 'order-2');
    expect(addSalesOrderJobSpy).toHaveBeenCalledTimes(2);
  });
});
