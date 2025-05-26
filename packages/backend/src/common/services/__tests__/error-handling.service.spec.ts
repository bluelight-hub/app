import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DEFAULT_FEATURE_FLAGS, DEVELOPMENT_ERROR_CONFIG, PRODUCTION_ERROR_CONFIG, TEST_ERROR_CONFIG } from '../../config/error-handling.config';
import { ErrorHandlingService } from '../error-handling.service';

describe('ErrorHandlingService', () => {
    let service: ErrorHandlingService;

    const createMockConfigService = (config: Record<string, any> = {}) => ({
        get: jest.fn((key: string, defaultValue?: any) => config[key] ?? defaultValue),
        set: jest.fn(),
        getOrThrow: jest.fn((key: string) => {
            const value = config[key];
            if (value === undefined) {
                throw new Error(`Configuration key "${key}" is not defined`);
            }
            return value;
        }),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ErrorHandlingService,
                {
                    provide: ConfigService,
                    useValue: createMockConfigService({
                        NODE_ENV: 'test',
                    }),
                },
            ],
        }).compile();

        service = module.get<ErrorHandlingService>(ErrorHandlingService);
    });

    afterEach(() => {
        service.cleanup();
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('sollte korrekt mit Test-Umgebung initialisiert werden', () => {
            expect(service).toBeDefined();
            expect(service.getConfig()).toEqual(TEST_ERROR_CONFIG);
        });

        it('sollte Development-Konfiguration für development Umgebung laden', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'development',
                        }),
                    },
                ],
            }).compile();

            const devService = module.get<ErrorHandlingService>(ErrorHandlingService);
            expect(devService.getConfig()).toEqual(DEVELOPMENT_ERROR_CONFIG);
            devService.cleanup();
        });

        it('sollte Production-Konfiguration für production Umgebung laden', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'production',
                        }),
                    },
                ],
            }).compile();

            const prodService = module.get<ErrorHandlingService>(ErrorHandlingService);
            expect(prodService.getConfig()).toEqual(PRODUCTION_ERROR_CONFIG);
            prodService.cleanup();
        });
    });

    describe('Feature Flags', () => {
        it('sollte Standard Feature Flags laden', () => {
            const flags = service.getFeatureFlags();
            expect(flags.enableAdvancedRetry).toBe(DEFAULT_FEATURE_FLAGS.enableAdvancedRetry);
            expect(flags.enableDuplicateDetection).toBe(DEFAULT_FEATURE_FLAGS.enableDuplicateDetection);
            expect(flags.enableMetricsCollection).toBe(DEFAULT_FEATURE_FLAGS.enableMetricsCollection);
        });

        it('sollte umgebungsspezifische Feature Flags aus Config laden', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'test',
                            ERROR_HANDLING_ENABLE_ADVANCED_RETRY: false,
                            ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION: false,
                        }),
                    },
                ],
            }).compile();

            const testService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const flags = testService.getFeatureFlags();

            expect(flags.enableAdvancedRetry).toBe(false);
            expect(flags.enableDuplicateDetection).toBe(false);
            testService.cleanup();
        });
    });

    describe('executeWithErrorHandling', () => {
        it('sollte Operation erfolgreich ausführen', async () => {
            const mockOperation = jest.fn().mockResolvedValue('success');

            const result = await service.executeWithErrorHandling(
                mockOperation,
                'test-operation',
                { test: 'data' },
            );

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalledTimes(1);
        });

        it('sollte Fehler korrekt behandeln und propagieren', async () => {
            const error = new Error('Test error');
            const mockOperation = jest.fn().mockRejectedValue(error);

            await expect(
                service.executeWithErrorHandling(mockOperation, 'test-operation')
            ).rejects.toThrow('Test error');

            expect(mockOperation).toHaveBeenCalled();
        });

        it('sollte Duplicate Detection verwenden wenn aktiviert', async () => {
            const mockOperation = jest.fn().mockResolvedValue('result');
            const operationData = { name: 'test' };

            // Ersten Aufruf
            const result1 = await service.executeWithErrorHandling(
                mockOperation,
                'duplicate-test',
                operationData,
            );

            // Zweiten Aufruf mit gleichen Daten
            const result2 = await service.executeWithErrorHandling(
                mockOperation,
                'duplicate-test',
                operationData,
            );

            expect(result1).toBe('result');
            expect(result2).toBe('result');
            expect(mockOperation).toHaveBeenCalledTimes(1); // Sollte nur einmal aufgerufen werden
        });
    });

    describe('Validation', () => {
        it('sollte Einsatz-Erstellung in Test-Umgebung validieren', () => {
            const validData = { name: 'Test Einsatz', beschreibung: 'Test' };

            expect(() => {
                service.validateOperation(validData, 'create-einsatz');
            }).not.toThrow();
        });

        it('sollte ungültige Einsatz-Daten ablehnen', () => {
            const invalidData = { name: '', beschreibung: 'Test' };

            expect(() => {
                service.validateOperation(invalidData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');
        });

        it('sollte zu kurze Namen ablehnen', () => {
            const invalidData = { name: 'AB', beschreibung: 'Test' };

            expect(() => {
                service.validateOperation(invalidData, 'create-einsatz');
            }).toThrow('Einsatz name must be at least 3 characters long');
        });

        it('sollte zu lange Namen ablehnen', () => {
            const invalidData = { name: 'A'.repeat(101), beschreibung: 'Test' };

            expect(() => {
                service.validateOperation(invalidData, 'create-einsatz');
            }).toThrow('Einsatz name must not exceed 100 characters');
        });
    });

    describe('Production-spezifische Validierung', () => {
        let prodService: ErrorHandlingService;

        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'production',
                        }),
                    },
                ],
            }).compile();

            prodService = module.get<ErrorHandlingService>(ErrorHandlingService);
        });

        afterEach(() => {
            prodService.cleanup();
        });

        it('sollte Test-Namen in Production ablehnen', () => {
            const testData = { name: 'Test Einsatz', beschreibung: 'Test' };

            expect(() => {
                prodService.validateOperation(testData, 'create-einsatz');
            }).toThrow('Test or dev names are not allowed in production');
        });

        it('sollte Dev-Namen in Production ablehnen', () => {
            const devData = { name: 'Dev Environment', beschreibung: 'Dev' };

            expect(() => {
                prodService.validateOperation(devData, 'create-einsatz');
            }).toThrow('Test or dev names are not allowed in production');
        });

        it('sollte gültige Production-Namen akzeptieren', () => {
            const validData = { name: 'Production Einsatz', beschreibung: 'Valid' };

            expect(() => {
                prodService.validateOperation(validData, 'create-einsatz');
            }).not.toThrow();
        });
    });

    describe('Metrics', () => {
        it('sollte initiale Metriken zurückgeben', () => {
            const metrics = service.getMetrics();

            expect(metrics.totalErrors).toBe(0);
            expect(metrics.retryableErrors).toBe(0);
            expect(metrics.nonRetryableErrors).toBe(0);
            expect(metrics.successfulRetries).toBe(0);
            expect(metrics.failedRetries).toBe(0);
            expect(metrics.duplicateOperations).toBe(0);
            expect(metrics.averageRetryAttempts).toBe(0);
        });

        it('sollte Metriken bei Fehlern aktualisieren wenn collectErrorMetrics aktiviert ist', async () => {
            // Service mit aktivierter Metriken-Sammlung erstellen
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'development', // Development hat collectErrorMetrics: true
                            ERROR_HANDLING_ENABLE_ADVANCED_RETRY: false, // Disable retry für schnelleren Test
                        }),
                    },
                ],
            }).compile();

            const devService = module.get<ErrorHandlingService>(ErrorHandlingService);

            const error = new Error('Test error') as any;
            error.code = '23505'; // Retryable error
            const mockOperation = jest.fn().mockRejectedValue(error);

            try {
                await devService.executeWithErrorHandling(
                    mockOperation,
                    'test-operation',
                    undefined, // keine data für Duplicate Detection
                    { maxRetries: 0 } // keine Retries für schnelleren Test
                );
            } catch (e) {
                // Fehler ignorieren für Test
            }

            const metrics = devService.getMetrics();
            expect(metrics.totalErrors).toBeGreaterThan(0);
            expect(metrics.retryableErrors).toBeGreaterThan(0);

            devService.cleanup();
        }, 10000); // Erhöhtes Timeout für diesen Test

        it('sollte in Test-Umgebung keine Metriken sammeln', async () => {
            const error = new Error('Test error') as any;
            error.code = '23505'; // Retryable error
            const mockOperation = jest.fn().mockRejectedValue(error);

            try {
                await service.executeWithErrorHandling(mockOperation, 'test-operation');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            const metrics = service.getMetrics();
            // In Test-Umgebung ist collectErrorMetrics: false
            expect(metrics.totalErrors).toBe(0);
        });
    });

    describe('Duplicate Detection Stats', () => {
        it('sollte Duplicate Detection Statistiken zurückgeben', () => {
            const stats = service.getDuplicateDetectionStats();

            expect(stats).toHaveProperty('size');
            expect(typeof stats.size).toBe('number');
            expect(stats.size).toBe(0); // Initial leer

            // Optional properties nur wenn Cache nicht leer ist
            if (stats.size > 0) {
                expect(stats).toHaveProperty('oldestEntry');
                expect(stats).toHaveProperty('newestEntry');
            }
        });
    });

    describe('Cleanup', () => {
        it('sollte Ressourcen ordnungsgemäß bereinigen', () => {

            service.cleanup();

            // Nach cleanup sollten Cache-Statistiken zurückgesetzt sein
            const finalStats = service.getDuplicateDetectionStats();
            expect(finalStats.size).toBe(0);
        });
    });
}); 