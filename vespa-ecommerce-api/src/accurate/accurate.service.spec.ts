import { Test, TestingModule } from '@nestjs/testing';
import { AccurateService } from './accurate.service';

describe('AccurateService', () => {
  let service: AccurateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccurateService],
    }).compile();

    service = module.get<AccurateService>(AccurateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
