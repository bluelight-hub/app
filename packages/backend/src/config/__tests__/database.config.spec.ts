import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseConfig } from '../database.config';

describe('DatabaseConfig', () => {
    let databaseConfig: DatabaseConfig;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        // Mock ConfigService
        const mockConfigService = {
            getOrThrow: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DatabaseConfig,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        databaseConfig = module.get<DatabaseConfig>(DatabaseConfig);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should be defined', () => {
            expect(databaseConfig).toBeDefined();
        });

        it('should inject ConfigService', () => {
            expect(configService).toBeDefined();
        });
    });

    describe('databaseUrl', () => {
        it('should return database URL from config service', () => {
            const mockDatabaseUrl = 'postgresql://user:password@localhost:5432/test_db';
            configService.getOrThrow.mockReturnValue(mockDatabaseUrl);

            const result = databaseConfig.databaseUrl;

            expect(result).toBe(mockDatabaseUrl);
            expect(configService.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
            expect(configService.getOrThrow).toHaveBeenCalledTimes(1);
        });

        it('should call getOrThrow with correct parameter type', () => {
            const mockDatabaseUrl = 'postgresql://localhost:5432/production_db';
            configService.getOrThrow.mockReturnValue(mockDatabaseUrl);

            const result = databaseConfig.databaseUrl;

            expect(configService.getOrThrow).toHaveBeenCalledWith<[string]>('DATABASE_URL');
            expect(result).toBe(mockDatabaseUrl);
        });

        it('should handle different database URL formats', () => {
            const testCases = [
                'postgresql://user:pass@localhost:5432/mydb',
                'postgres://admin@db.example.com:5432/production',
                'postgresql://user@localhost/development',
                'sqlite://./database.sqlite',
            ];

            testCases.forEach((url) => {
                configService.getOrThrow.mockReturnValue(url);

                const result = databaseConfig.databaseUrl;

                expect(result).toBe(url);
            });

            expect(configService.getOrThrow).toHaveBeenCalledTimes(testCases.length);
        });

        it('should throw error when DATABASE_URL is not found', () => {
            const error = new Error('Configuration key "DATABASE_URL" not found');
            configService.getOrThrow.mockImplementation(() => {
                throw error;
            });

            expect(() => databaseConfig.databaseUrl).toThrow(error);
            expect(configService.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
        });

        it('should be a getter that can be called multiple times', () => {
            const mockDatabaseUrl = 'postgresql://localhost:5432/test';
            configService.getOrThrow.mockReturnValue(mockDatabaseUrl);

            // Call multiple times
            const result1 = databaseConfig.databaseUrl;
            const result2 = databaseConfig.databaseUrl;
            const result3 = databaseConfig.databaseUrl;

            expect(result1).toBe(mockDatabaseUrl);
            expect(result2).toBe(mockDatabaseUrl);
            expect(result3).toBe(mockDatabaseUrl);
            expect(configService.getOrThrow).toHaveBeenCalledTimes(3);
        });
    });

    describe('Error Handling', () => {
        it('should propagate ConfigService errors', () => {
            const customError = new Error('Environment variable DATABASE_URL is missing');
            configService.getOrThrow.mockImplementation(() => {
                throw customError;
            });

            expect(() => databaseConfig.databaseUrl).toThrow(customError);
        });

        it('should handle undefined return from ConfigService', () => {
            configService.getOrThrow.mockReturnValue(undefined);

            const result = databaseConfig.databaseUrl;

            expect(result).toBeUndefined();
            expect(configService.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
        });
    });

    describe('Integration with NestJS', () => {
        it('should be injectable as a service', () => {
            expect(databaseConfig).toBeInstanceOf(DatabaseConfig);
        });

        it('should work with dependency injection', () => {
            // Verify that the service was properly injected and can access its dependencies
            expect(databaseConfig['configService']).toBeDefined();
            expect(databaseConfig['configService']).toBe(configService);
        });
    });
}); 