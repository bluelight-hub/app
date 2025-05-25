import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { EinsatzService } from '../../einsatz/einsatz.service';
import { DatabaseCheckService } from '../database-check.service';
import { SeedService } from '../seed.service';

describe.skip('SeedService', () => {
    let service: SeedService;
    let prismaService: jest.Mocked<PrismaService>;
    let configService: jest.Mocked<ConfigService>;
    let databaseCheckService: jest.Mocked<DatabaseCheckService>;
    let einsatzService: jest.Mocked<EinsatzService>;

    beforeEach(async () => {
        const mockPrismaService = {
            $transaction: jest.fn().mockImplementation(async (fn) => await fn(mockPrismaService)),
            einsatz: {
                count: jest.fn().mockResolvedValue(0),
                findFirst: jest.fn().mockResolvedValue(null),
            },
        } as any;

        const mockConfigService = {
            get: jest.fn(),
        };

        const mockDatabaseCheckService = {
            checkConnection: jest.fn(),
        };

        const mockEinsatzService = {
            create: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeedService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: DatabaseCheckService,
                    useValue: mockDatabaseCheckService,
                },
                {
                    provide: EinsatzService,
                    useValue: mockEinsatzService,
                },
            ],
        }).compile();

        service = module.get<SeedService>(SeedService);
        prismaService = module.get(PrismaService);
        configService = module.get(ConfigService);
        databaseCheckService = module.get(DatabaseCheckService);
        einsatzService = module.get(EinsatzService);

        // Silence logger during tests
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service Creation', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should have logger instance', () => {
            expect(service['logger']).toBeDefined();
        });

        it('should have correct retry configuration', () => {
            expect(service['maxRetries']).toBe(3);
            expect(service['retryDelay']).toBe(1000);
        });
    });

    describe('executeWithTransaction', () => {
        it('should execute seed function successfully', async () => {
            const mockSeedFunction = jest.fn().mockResolvedValue('success');
            prismaService.$transaction.mockResolvedValue('success');

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(true);
            expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
            expect(mockSeedFunction).toHaveBeenCalledTimes(1);
        });

        it('should handle transaction with timeout and isolation level', async () => {
            const mockSeedFunction = jest.fn().mockResolvedValue('success');
            prismaService.$transaction.mockResolvedValue('success');

            await service.executeWithTransaction(mockSeedFunction);

            expect(prismaService.$transaction).toHaveBeenCalledWith(
                expect.any(Function),
                {
                    timeout: 30000,
                    isolationLevel: 'Serializable',
                }
            );
        });

        it('should handle unique constraint violation (23505)', async () => {
            const mockSeedFunction = jest.fn();
            const uniqueError = { code: '23505' };
            prismaService.$transaction.mockRejectedValue(uniqueError);

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(false);
            expect(Logger.prototype.warn).toHaveBeenCalledWith(
                'Seed-Prozess abgebrochen: Datensatz existiert bereits'
            );
        });

        it('should handle query timeout (57014)', async () => {
            const mockSeedFunction = jest.fn();
            const timeoutError = { code: '57014' };
            prismaService.$transaction.mockRejectedValue(timeoutError);

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(false);
            expect(Logger.prototype.error).toHaveBeenCalledWith(
                'Seed-Prozess: Abfrage-Timeout'
            );
        });

        it('should retry on deadlock (40P01) and eventually succeed', async () => {
            const mockSeedFunction = jest.fn().mockResolvedValue('success');
            const deadlockError = { code: '40P01' };

            prismaService.$transaction
                .mockRejectedValueOnce(deadlockError)
                .mockResolvedValueOnce('success');

            // Mock delay method to speed up test
            jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(true);
            expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
            expect(Logger.prototype.warn).toHaveBeenCalledWith(
                'Deadlock erkannt, Wiederholungsversuch 1/3'
            );
        });

        it('should fail after max retries', async () => {
            const mockSeedFunction = jest.fn();
            const genericError = { code: 'GENERIC_ERROR' };
            prismaService.$transaction.mockRejectedValue(genericError);

            // Mock delay method to speed up test
            jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(false);
            expect(prismaService.$transaction).toHaveBeenCalledTimes(3);
            expect(Logger.prototype.error).toHaveBeenCalledWith(
                'Seed-Prozess nach 3 Versuchen fehlgeschlagen'
            );
        });

        it('should handle generic errors', async () => {
            const mockSeedFunction = jest.fn();
            const genericError = new Error('Generic error');
            prismaService.$transaction.mockRejectedValue(genericError);

            // Mock delay method to speed up test
            jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(false);
            expect(Logger.prototype.error).toHaveBeenCalledWith(
                'Fehler während des Seed-Prozesses:',
                genericError
            );
        });
    });

    describe('seedInitialEinsatz', () => {
        it('should be defined as a method', () => {
            expect(typeof service.seedInitialEinsatz).toBe('function');
        });

        // More tests would require complex Prisma type mocking
        // Skipped due to TypeScript complexity with Prisma generated types
    });

    describe('delay (private method)', () => {
        it('should delay execution', async () => {
            const startTime = Date.now();

            // Call the private delay method via executeWithTransaction test context
            await service['delay'](100);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Allow some tolerance for timing
            expect(duration).toBeGreaterThanOrEqual(90);
            expect(duration).toBeLessThan(200);
        });

        it('should resolve after specified milliseconds', async () => {
            const delayPromise = service['delay'](50);
            expect(delayPromise).toBeInstanceOf(Promise);

            await expect(delayPromise).resolves.toBeUndefined();
        });

        it('should work with zero delay', async () => {
            const startTime = Date.now();
            await service['delay'](0);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(10);
        });
    });

    describe('Error Recovery and Edge Cases', () => {
        it('should handle mixed error codes in retry logic', async () => {
            const mockSeedFunction = jest.fn();
            const deadlockError = { code: '40P01' };
            const uniqueError = { code: '23505' };

            prismaService.$transaction
                .mockRejectedValueOnce(deadlockError)
                .mockRejectedValueOnce(uniqueError);

            jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

            const result = await service.executeWithTransaction(mockSeedFunction);

            expect(result).toBe(false);
            expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
        });

        it('should handle exponential backoff correctly', async () => {
            const mockSeedFunction = jest.fn();
            const deadlockError = { code: '40P01' };

            prismaService.$transaction.mockRejectedValue(deadlockError);
            const delaySpy = jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

            await service.executeWithTransaction(mockSeedFunction);

            // Check that delay is called with exponential backoff
            expect(delaySpy).toHaveBeenCalledWith(1000); // First retry: 1000 * 1
            expect(delaySpy).toHaveBeenCalledWith(2000); // Second retry: 1000 * 2
        });
    });
}); 