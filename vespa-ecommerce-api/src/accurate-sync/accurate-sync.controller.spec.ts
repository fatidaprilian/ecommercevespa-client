import { Test, TestingModule } from '@nestjs/testing';
import { AccurateSyncController } from './accurate-sync.controller';

describe('AccurateSyncController', () => {
  let controller: AccurateSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccurateSyncController],
    }).compile();

    controller = module.get<AccurateSyncController>(AccurateSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
