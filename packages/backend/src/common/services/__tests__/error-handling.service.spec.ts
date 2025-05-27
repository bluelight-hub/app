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

    describe('Error Classification', () => {
        let devService: ErrorHandlingService;

        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'development',
                            ERROR_HANDLING_ENABLE_ADVANCED_RETRY: false, // Deaktiviere Retry für schnellere Tests
                            ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION: false,
                        }),
                    },
                ],
            }).compile();

            devService = module.get<ErrorHandlingService>(ErrorHandlingService);
        });

        afterEach(() => {
            devService.cleanup();
        });

        it('sollte PostgreSQL retryable Fehler erkennen', async () => {
            const postgresErrors = [
                { code: '23505', message: 'Unique constraint violation' },
                { code: '40P01', message: 'Deadlock detected' },
                { code: '40001', message: 'Serialization failure' },
                { code: '57014', message: 'Query canceled' },
                { code: '08000', message: 'Connection exception' }
            ];

            for (const errorInfo of postgresErrors) {
                const error = new Error(errorInfo.message) as any;
                error.code = errorInfo.code;
                const mockOperation = jest.fn().mockRejectedValue(error);

                try {
                    await devService.executeWithErrorHandling(mockOperation, 'postgres-test');
                } catch (e) {
                    // Fehler ignorieren für Test
                }

                const metrics = devService.getMetrics();
                expect(metrics.retryableErrors).toBeGreaterThan(0);
            }
        });

        it('sollte Prisma retryable Fehler erkennen', async () => {
            const prismaError = new Error('Prisma unique constraint') as any;
            prismaError.code = 'P2002';
            const mockOperation = jest.fn().mockRejectedValue(prismaError);

            try {
                await devService.executeWithErrorHandling(mockOperation, 'prisma-test');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            const metrics = devService.getMetrics();
            expect(metrics.retryableErrors).toBeGreaterThan(0);
        });

        it('sollte Network-Fehler als retryable erkennen', async () => {
            const networkErrors = [
                'ECONNRESET: Connection reset by peer',
                'ENOTFOUND: DNS lookup failed',
                'ETIMEDOUT: Connection timed out'
            ];

            for (const errorMessage of networkErrors) {
                const networkError = new Error(errorMessage);
                const mockOperation = jest.fn().mockRejectedValue(networkError);

                try {
                    await devService.executeWithErrorHandling(mockOperation, 'network-test');
                } catch (e) {
                    // Fehler ignorieren für Test
                }

                const metrics = devService.getMetrics();
                expect(metrics.retryableErrors).toBeGreaterThan(0);
            }
        });

        it('sollte non-retryable Fehler erkennen', async () => {
            const nonRetryableError = new Error('Business logic error') as any;
            nonRetryableError.code = 'CUSTOM_ERROR';
            const mockOperation = jest.fn().mockRejectedValue(nonRetryableError);

            try {
                await devService.executeWithErrorHandling(mockOperation, 'non-retryable-test');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            const metrics = devService.getMetrics();
            expect(metrics.nonRetryableErrors).toBeGreaterThan(0);
        });
    });

    describe('Error Handling Paths', () => {
        it('sollte Operation ohne Duplicate Detection ausführen', async () => {
            // Service mit deaktivierter Duplicate Detection
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'test',
                            ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION: false,
                            ERROR_HANDLING_ENABLE_ADVANCED_RETRY: false,
                        }),
                    },
                ],
            }).compile();

            const noDuplicateService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const mockOperation = jest.fn().mockResolvedValue('success');

            const result = await noDuplicateService.executeWithErrorHandling(
                mockOperation,
                'no-duplicate-test',
                { test: 'data' } // Daten werden ignoriert wenn Duplicate Detection deaktiviert ist
            );

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalledTimes(1);
            noDuplicateService.cleanup();
        });

        it('sollte Operation ohne Advanced Retry ausführen', async () => {
            // Service mit deaktiviertem Advanced Retry
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'test',
                            ERROR_HANDLING_ENABLE_ADVANCED_RETRY: false,
                        }),
                    },
                ],
            }).compile();

            const noRetryService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const mockOperation = jest.fn().mockResolvedValue('no-retry-success');

            const result = await noRetryService.executeWithErrorHandling(
                mockOperation,
                'no-retry-test'
            );

            expect(result).toBe('no-retry-success');
            expect(mockOperation).toHaveBeenCalledTimes(1);
            noRetryService.cleanup();
        });

        it('sollte verbose Error Reporting verwenden', async () => {
            // Service mit verbose Error Reporting
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'development', // Development hat verbose Error Reporting
                        }),
                    },
                ],
            }).compile();

            const verboseService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const detailedError = new Error('Detailed error') as any;
            detailedError.code = 'DETAILED_CODE';
            detailedError.stack = 'Mock stack trace';

            const mockOperation = jest.fn().mockRejectedValue(detailedError);

            // Mock logger to spy on calls
            const loggerSpy = jest.spyOn(verboseService['logger'], 'error');

            try {
                await verboseService.executeWithErrorHandling(mockOperation, 'verbose-test');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            expect(loggerSpy).toHaveBeenCalled();
            const logCall = loggerSpy.mock.calls.find(call =>
                call[0].includes('Operation verbose-test failed after')
            );
            expect(logCall).toBeDefined();

            verboseService.cleanup();
        });

        it('sollte non-verbose Error Reporting verwenden', async () => {
            // Service mit non-verbose Error Reporting (Production)
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'production', // Production hat non-verbose Error Reporting
                        }),
                    },
                ],
            }).compile();

            const nonVerboseService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const simpleError = new Error('Simple error') as any;
            simpleError.code = 'SIMPLE_CODE';

            const mockOperation = jest.fn().mockRejectedValue(simpleError);

            // Mock logger to spy on calls
            const loggerSpy = jest.spyOn(nonVerboseService['logger'], 'error');

            try {
                await nonVerboseService.executeWithErrorHandling(mockOperation, 'non-verbose-test');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            expect(loggerSpy).toHaveBeenCalled();
            const logCall = loggerSpy.mock.calls.find(call =>
                call[0].includes('Operation non-verbose-test failed: Simple error')
            );
            expect(logCall).toBeDefined();

            nonVerboseService.cleanup();
        });
    });

    describe('Validation Edge Cases', () => {
        let strictService: ErrorHandlingService;
        let nonStrictService: ErrorHandlingService;

        beforeEach(async () => {
            // Service mit strict validation
            const strictModule: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'production', // Production hat strict validation
                        }),
                    },
                ],
            }).compile();

            // Service ohne strict validation
            const nonStrictModule: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'development', // Development hat keine strict validation
                        }),
                    },
                ],
            }).compile();

            strictService = strictModule.get<ErrorHandlingService>(ErrorHandlingService);
            nonStrictService = nonStrictModule.get<ErrorHandlingService>(ErrorHandlingService);
        });

        afterEach(() => {
            strictService.cleanup();
            nonStrictService.cleanup();
        });

        it('sollte non-strict validation immer erfolgreich sein', () => {
            const invalidData = {}; // Vollständig leere Daten

            const result = nonStrictService.validateOperation(invalidData, 'create-einsatz');
            expect(result).toBe(true);
        });

        it('sollte unbekannte Operation Types akzeptieren', () => {
            const someData = { test: 'data' };

            const result = strictService.validateOperation(someData, 'unknown-operation');
            expect(result).toBe(true);
        });

        it('sollte null/undefined name in strict mode ablehnen', () => {
            const nullData = { name: null };
            const undefinedData = { name: undefined };
            const emptyStringData = { name: '' };

            expect(() => {
                strictService.validateOperation(nullData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');

            expect(() => {
                strictService.validateOperation(undefinedData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');

            expect(() => {
                strictService.validateOperation(emptyStringData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');
        });

        it('sollte non-string name in strict mode ablehnen', () => {
            const numberData = { name: 123 };
            const objectData = { name: {} };
            const arrayData = { name: [] };

            expect(() => {
                strictService.validateOperation(numberData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');

            expect(() => {
                strictService.validateOperation(objectData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');

            expect(() => {
                strictService.validateOperation(arrayData, 'create-einsatz');
            }).toThrow('Einsatz name is required and must be a string');
        });
    });

    describe('Additional Feature Flag Coverage', () => {
        it('sollte alle Feature Flags aus Config laden', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorHandlingService,
                    {
                        provide: ConfigService,
                        useValue: createMockConfigService({
                            NODE_ENV: 'test',
                            ERROR_HANDLING_ENABLE_ADVANCED_RETRY: true,
                            ERROR_HANDLING_ENABLE_DUPLICATE_DETECTION: true,
                            ERROR_HANDLING_ENABLE_METRICS: true,
                            ERROR_HANDLING_ENABLE_CIRCUIT_BREAKER: true,
                            ERROR_HANDLING_ENABLE_RATE_LIMITING: true,
                        }),
                    },
                ],
            }).compile();

            const fullFeaturesService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const flags = fullFeaturesService.getFeatureFlags();

            expect(flags.enableAdvancedRetry).toBe(true);
            expect(flags.enableDuplicateDetection).toBe(true);
            expect(flags.enableMetricsCollection).toBe(true);
            expect(flags.enableCircuitBreaker).toBe(true);
            expect(flags.enableRateLimiting).toBe(true);

            fullFeaturesService.cleanup();
        });

        it('sollte Error ohne Code im verbose Mode loggen', async () => {
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

            const verboseService = module.get<ErrorHandlingService>(ErrorHandlingService);
            const errorWithoutCode = new Error('Error without code');
            // Explizit keinen code setzen

            const mockOperation = jest.fn().mockRejectedValue(errorWithoutCode);
            const loggerSpy = jest.spyOn(verboseService['logger'], 'error');

            try {
                await verboseService.executeWithErrorHandling(mockOperation, 'no-code-test');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            expect(loggerSpy).toHaveBeenCalled();
            verboseService.cleanup();
        });

        it('sollte Error ohne Code im non-verbose Mode loggen', async () => {
            const errorWithoutCode = new Error('Simple error without code');
            const mockOperation = jest.fn().mockRejectedValue(errorWithoutCode);
            const loggerSpy = jest.spyOn(service['logger'], 'error');

            try {
                await service.executeWithErrorHandling(mockOperation, 'simple-no-code-test');
            } catch (e) {
                // Fehler ignorieren für Test
            }

            expect(loggerSpy).toHaveBeenCalled();
            // Prüfe, dass der zweite Parameter undefined ist (kein Code)
            const lastCall = loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1];
            expect(lastCall[1]).toBeUndefined();
        });
    });
}); 