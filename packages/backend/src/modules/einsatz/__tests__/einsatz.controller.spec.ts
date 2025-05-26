import { ErrorHandlingService } from '@/common/services/error-handling.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEinsatzDto } from '../dto/create-einsatz.dto';
import { EinsatzController } from '../einsatz.controller';
import { EinsatzService } from '../einsatz.service';
import { Einsatz } from '../entities/einsatz.entity';

describe('EinsatzController', () => {
    let controller: EinsatzController;

    const mockEinsatzService = {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    const mockErrorHandlingService = {
        executeWithErrorHandling: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EinsatzController],
            providers: [
                {
                    provide: EinsatzService,
                    useValue: mockEinsatzService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: ErrorHandlingService,
                    useValue: mockErrorHandlingService,
                },
            ],
        }).compile();

        controller = module.get<EinsatzController>(EinsatzController);

        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return an array of einsatzs', async () => {
            // Arrange
            const expectedEinsatzs: Einsatz[] = [
                {
                    id: 'test-id-1',
                    name: 'Test Einsatz 1',
                    beschreibung: 'Beschreibung 1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 'test-id-2',
                    name: 'Test Einsatz 2',
                    beschreibung: 'Beschreibung 2',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];
            mockEinsatzService.findAll.mockResolvedValue(expectedEinsatzs);

            // Act
            const result = await controller.findAll();

            // Assert
            expect(result).toBe(expectedEinsatzs);
            expect(mockEinsatzService.findAll).toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should return a single einsatz', async () => {
            // Arrange
            const expectedEinsatz: Einsatz = {
                id: 'test-id-1',
                name: 'Test Einsatz 1',
                beschreibung: 'Beschreibung 1',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockEinsatzService.findById.mockResolvedValue(expectedEinsatz);

            // Act
            const result = await controller.findById('test-id-1');

            // Assert
            expect(result).toBe(expectedEinsatz);
            expect(mockEinsatzService.findById).toHaveBeenCalledWith('test-id-1');
        });
    });

    describe('create', () => {
        it('should create and return a new einsatz', async () => {
            // Arrange
            const createEinsatzDto: CreateEinsatzDto = {
                name: 'New Einsatz',
                beschreibung: 'New Beschreibung',
            };

            const createdEinsatz: Einsatz = {
                id: 'new-test-id',
                name: 'New Einsatz',
                beschreibung: 'New Beschreibung',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Mock der ErrorHandlingService executeWithErrorHandling Methode
            mockErrorHandlingService.executeWithErrorHandling.mockImplementation(
                async (operation) => await operation()
            );
            mockEinsatzService.create.mockResolvedValue(createdEinsatz);

            // Act
            const result = await controller.create(createEinsatzDto);

            // Assert
            expect(result).toBe(createdEinsatz);
            expect(mockErrorHandlingService.executeWithErrorHandling).toHaveBeenCalled();
        });
    });
}); 