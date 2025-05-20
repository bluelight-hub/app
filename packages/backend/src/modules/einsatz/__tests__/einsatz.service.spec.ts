import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { EinsatzService } from '../einsatz.service';
import { CreateEinsatzDto } from '../dto/create-einsatz.dto';

describe('EinsatzService', () => {
    let service: EinsatzService;
    const prismaMock = {
        einsatz: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
        },
    } as unknown as PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EinsatzService,
                { provide: PrismaService, useValue: prismaMock },
            ],
        }).compile();

        service = module.get<EinsatzService>(EinsatzService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('legt einen Einsatz an', async () => {
            const dto: CreateEinsatzDto = { name: 'Test' };
            const created = { id: '1', name: 'Test', createdAt: new Date(), updatedAt: new Date() };
            (prismaMock.einsatz.create as jest.Mock).mockResolvedValue(created);

            const result = await service.create(dto);

            expect(result).toBe(created);
            expect(prismaMock.einsatz.create).toHaveBeenCalledWith({ data: dto });
        });
    });

    describe('count', () => {
        it('gibt die Anzahl der Einsätze zurück', async () => {
            (prismaMock.einsatz.count as jest.Mock).mockResolvedValue(5);

            const result = await service.count();

            expect(result).toBe(5);
            expect(prismaMock.einsatz.count).toHaveBeenCalled();
        });
    });
});
