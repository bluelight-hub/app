import { HealthCheckResult, HealthCheckService, HealthCheckStatus, HealthIndicatorStatus, TerminusModule } from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
    let controller: HealthController;
    let healthService: HealthCheckService;

    // Mock der Health-Check Ergebnisse
    const mockHealthCheckResult: Partial<HealthCheckResult> = {
        status: 'up' as HealthCheckStatus,
        info: {
            database: { status: 'up' as HealthIndicatorStatus },
            memory_heap: { status: 'up' as HealthIndicatorStatus },
            memory_rss: { status: 'up' as HealthIndicatorStatus },
            storage: { status: 'up' as HealthIndicatorStatus },
        },
        error: {},
        details: {
            database: { status: 'up' as HealthIndicatorStatus },
            memory_heap: { status: 'up' as HealthIndicatorStatus },
            memory_rss: { status: 'up' as HealthIndicatorStatus },
            storage: { status: 'up' as HealthIndicatorStatus },
        },
    };

    // Mock der Connection
    const mockConnection = {
        query: jest.fn().mockResolvedValue([]),
    } as unknown as Connection;

    // Mock der DataSource
    const mockDataSource = {
        query: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [TerminusModule],
            controllers: [HealthController],
            providers: [
                {
                    provide: Connection,
                    useValue: mockConnection,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthService = module.get<HealthCheckService>(HealthCheckService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('check', () => {
        it('should return health check results', async () => {
            // Mock der health.check Methode
            jest.spyOn(healthService, 'check').mockResolvedValue(mockHealthCheckResult as HealthCheckResult);

            const result = await controller.check();

            expect(result).toEqual(mockHealthCheckResult);
            expect(result.status).toBe('up');
            expect(result.info).toBeDefined();
            if (result.info) {
                expect(result.info.database).toBeDefined();
                expect(result.info.memory_heap).toBeDefined();
                expect(result.info.memory_rss).toBeDefined();
                expect(result.info.storage).toBeDefined();
            }
        });

        it('should handle database check failure', async () => {
            const mockErrorResult: Partial<HealthCheckResult> = {
                status: 'down' as HealthCheckStatus,
                error: {
                    database: {
                        status: 'down' as HealthIndicatorStatus,
                        message: 'database connection failed',
                    },
                },
                info: {
                    memory_heap: { status: 'up' as HealthIndicatorStatus },
                    memory_rss: { status: 'up' as HealthIndicatorStatus },
                    storage: { status: 'up' as HealthIndicatorStatus },
                },
                details: {
                    database: { status: 'down' as HealthIndicatorStatus },
                    memory_heap: { status: 'up' as HealthIndicatorStatus },
                    memory_rss: { status: 'up' as HealthIndicatorStatus },
                    storage: { status: 'up' as HealthIndicatorStatus },
                },
            };

            jest.spyOn(healthService, 'check').mockResolvedValue(mockErrorResult as HealthCheckResult);

            const result = await controller.check();

            expect(result.status).toBe('down');
            if (result.error) {
                expect(result.error.database).toBeDefined();
                expect(result.error.database.status).toBe('down');
            }
        });

        it('should handle memory check failure', async () => {
            const mockMemoryErrorResult: Partial<HealthCheckResult> = {
                status: 'down' as HealthCheckStatus,
                error: {
                    memory_heap: {
                        status: 'down' as HealthIndicatorStatus,
                        message: 'memory threshold exceeded',
                    },
                },
                info: {
                    database: { status: 'up' as HealthIndicatorStatus },
                    memory_rss: { status: 'up' as HealthIndicatorStatus },
                    storage: { status: 'up' as HealthIndicatorStatus },
                },
                details: {
                    database: { status: 'up' as HealthIndicatorStatus },
                    memory_heap: { status: 'down' as HealthIndicatorStatus },
                    memory_rss: { status: 'up' as HealthIndicatorStatus },
                    storage: { status: 'up' as HealthIndicatorStatus },
                },
            };

            jest.spyOn(healthService, 'check').mockResolvedValue(mockMemoryErrorResult as HealthCheckResult);

            const result = await controller.check();

            expect(result.status).toBe('down');
            if (result.error) {
                expect(result.error.memory_heap).toBeDefined();
                expect(result.error.memory_heap.status).toBe('down');
            }
        });

        it('should handle storage check failure', async () => {
            const mockStorageErrorResult: Partial<HealthCheckResult> = {
                status: 'down' as HealthCheckStatus,
                error: {
                    storage: {
                        status: 'down' as HealthIndicatorStatus,
                        message: 'storage space below threshold',
                    },
                },
                info: {
                    database: { status: 'up' as HealthIndicatorStatus },
                    memory_heap: { status: 'up' as HealthIndicatorStatus },
                    memory_rss: { status: 'up' as HealthIndicatorStatus },
                },
                details: {
                    database: { status: 'up' as HealthIndicatorStatus },
                    memory_heap: { status: 'up' as HealthIndicatorStatus },
                    memory_rss: { status: 'up' as HealthIndicatorStatus },
                    storage: { status: 'down' as HealthIndicatorStatus },
                },
            };

            jest.spyOn(healthService, 'check').mockResolvedValue(mockStorageErrorResult as HealthCheckResult);

            const result = await controller.check();

            expect(result.status).toBe('down');
            if (result.error) {
                expect(result.error.storage).toBeDefined();
                expect(result.error.storage.status).toBe('down');
            }
        });
    });
});