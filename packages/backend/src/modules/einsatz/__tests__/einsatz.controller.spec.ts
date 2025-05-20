import { Test, TestingModule } from '@nestjs/testing';
import { EinsatzController } from '../einsatz.controller';
import { EinsatzService } from '../einsatz.service';
import { CreateEinsatzDto } from '../dto/create-einsatz.dto';

describe('EinsatzController', () => {
    let controller: EinsatzController;
    const serviceMock = {
        findAll: jest.fn(),
        create: jest.fn(),
    } as unknown as EinsatzService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EinsatzController],
            providers: [{ provide: EinsatzService, useValue: serviceMock }],
        }).compile();

        controller = module.get<EinsatzController>(EinsatzController);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('delegiert an den Service', async () => {
            const dto: CreateEinsatzDto = { name: 'Alpha' };
            const created = { id: '1', name: 'Alpha', createdAt: new Date(), updatedAt: new Date() };
            (serviceMock.create as jest.Mock).mockResolvedValue(created);

            const result = await controller.create(dto);

            expect(result).toBe(created);
            expect(serviceMock.create).toHaveBeenCalledWith(dto);
        });
    });
});
