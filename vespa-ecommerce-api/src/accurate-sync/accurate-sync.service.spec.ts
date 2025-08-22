import { Test, TestingModule } from '@nestjs/testing';
import { AccurateSyncService } from './accurate-sync.service';

describe('AccurateSyncService', () => {
  let service: AccurateSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccurateSyncService],
    }).compile();

    service = module.get<AccurateSyncService>(AccurateSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
