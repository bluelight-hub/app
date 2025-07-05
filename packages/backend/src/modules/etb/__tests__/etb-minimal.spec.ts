import { Test } from '@nestjs/testing';
import { EtbController } from '../etb.controller';
import { EtbService } from '../etb.service';

// Minimaler Test, der keine Prisma-Imports benötigt
describe('EtbController - Minimal', () => {
  let controller: EtbController;

  beforeEach(async () => {
    // Mock-Service, der keine Prisma-Abhängigkeiten erfordert
    const mockEtbService = {
      findAll: jest.fn().mockResolvedValue({ items: [], pagination: { total: 0 } }),
    };

    const module = await Test.createTestingModule({
      controllers: [EtbController],
      providers: [
        {
          provide: EtbService,
          useValue: mockEtbService,
        },
      ],
    }).compile();

    controller = module.get<EtbController>(EtbController);
  });

  it('sollte definiert sein', () => {
    expect(controller).toBeDefined();
  });
});
