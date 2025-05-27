import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
    let service: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PrismaService],
        }).compile();

        service = module.get<PrismaService>(PrismaService);

        // Mock the Prisma client methods
        service.$connect = jest.fn();
        service.$disconnect = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Service Creation', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should be instance of PrismaService', () => {
            expect(service.constructor.name).toBe('PrismaService');
        });

        it('should extend PrismaClient', () => {
            // PrismaService extends PrismaClient, so it should have client methods
            expect(service.$connect).toBeDefined();
            expect(service.$disconnect).toBeDefined();
        });
    });

    describe('onModuleInit', () => {
        it('should call $connect when module initializes', async () => {
            const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

            await service.onModuleInit();

            expect(connectSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle connection errors gracefully', async () => {
            const connectionError = new Error('Database connection failed');
            jest.spyOn(service, '$connect').mockRejectedValue(connectionError);

            await expect(service.onModuleInit()).rejects.toThrow('Database connection failed');
        });

        it('should be async function', async () => {
            const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

            const result = service.onModuleInit();

            expect(result).toBeInstanceOf(Promise);
            await result;
            expect(connectSpy).toHaveBeenCalled();
        });

        it('should handle successful connection', async () => {
            jest.spyOn(service, '$connect').mockResolvedValue(undefined);

            await expect(service.onModuleInit()).resolves.toBeUndefined();
        });
    });

    describe('onModuleDestroy', () => {
        it('should call $disconnect when module is destroyed', async () => {
            const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

            await service.onModuleDestroy();

            expect(disconnectSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle disconnection errors gracefully', async () => {
            const disconnectionError = new Error('Database disconnection failed');
            jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectionError);

            await expect(service.onModuleDestroy()).rejects.toThrow('Database disconnection failed');
        });

        it('should be async function', async () => {
            const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

            const result = service.onModuleDestroy();

            expect(result).toBeInstanceOf(Promise);
            await result;
            expect(disconnectSpy).toHaveBeenCalled();
        });

        it('should handle successful disconnection', async () => {
            jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

            await expect(service.onModuleDestroy()).resolves.toBeUndefined();
        });
    });

    describe('Lifecycle Integration', () => {
        it('should call both connect and disconnect in sequence', async () => {
            const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
            const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

            await service.onModuleInit();
            await service.onModuleDestroy();

            expect(connectSpy).toHaveBeenCalledTimes(1);
            expect(disconnectSpy).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple init calls', async () => {
            const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);

            await service.onModuleInit();
            await service.onModuleInit();

            expect(connectSpy).toHaveBeenCalledTimes(2);
        });

        it('should handle multiple destroy calls', async () => {
            const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

            await service.onModuleDestroy();
            await service.onModuleDestroy();

            expect(disconnectSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Lifecycle hooks compliance', () => {
        it('should implement OnModuleInit interface', () => {
            expect(typeof service.onModuleInit).toBe('function');
        });

        it('should implement OnModuleDestroy interface', () => {
            expect(typeof service.onModuleDestroy).toBe('function');
        });

        it('should have correct method signatures', () => {
            // onModuleInit should accept no parameters
            expect(service.onModuleInit.length).toBe(0);

            // onModuleDestroy should accept no parameters
            expect(service.onModuleDestroy.length).toBe(0);
        });
    });

    describe('Error scenarios', () => {
        it('should propagate connection timeout errors', async () => {
            const timeoutError = new Error('Connection timeout');
            jest.spyOn(service, '$connect').mockRejectedValue(timeoutError);

            await expect(service.onModuleInit()).rejects.toThrow('Connection timeout');
        });

        it('should propagate authentication errors', async () => {
            const authError = new Error('Authentication failed');
            jest.spyOn(service, '$connect').mockRejectedValue(authError);

            await expect(service.onModuleInit()).rejects.toThrow('Authentication failed');
        });

        it('should propagate disconnection timeout errors', async () => {
            const timeoutError = new Error('Disconnection timeout');
            jest.spyOn(service, '$disconnect').mockRejectedValue(timeoutError);

            await expect(service.onModuleDestroy()).rejects.toThrow('Disconnection timeout');
        });

        it('should handle network errors during disconnect', async () => {
            const networkError = new Error('Network error');
            jest.spyOn(service, '$disconnect').mockRejectedValue(networkError);

            await expect(service.onModuleDestroy()).rejects.toThrow('Network error');
        });
    });
}); 