import { Test, TestingModule } from '@nestjs/testing';
import { AccurateController } from './accurate.controller';

describe('AccurateController', () => {
  let controller: AccurateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccurateController],
    }).compile();

    controller = module.get<AccurateController>(AccurateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
