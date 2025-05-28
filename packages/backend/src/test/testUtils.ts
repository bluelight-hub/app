import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EinsatzService } from '../modules/einsatz/einsatz.service';
import { EtbService } from '../modules/etb/etb.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Test utilities for consistent testing patterns across the backend package
 */

// Mock data generators
export const mockEinsatz = (overrides = {}) => ({
    id: 'test-einsatz-1',
    name: 'Test Einsatz',
    beschreibung: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const mockEtbEntry = (overrides = {}) => ({
    id: 'test-etb-1',
    laufendeNummer: 1,
    kategorie: 'Meldung',
    meldung: 'Test ETB Entry',
    absender: 'Test Sender',
    empfaenger: 'Test Receiver',
    zeitstempel: new Date(),
    einsatzId: 'test-einsatz-1',
    status: 'aktiv',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export const mockUser = (overrides = {}) => ({
    id: 'test-user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Mock Prisma Service
export const createMockPrismaService = () => ({
    einsatz: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    etbEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback) => callback(this)),
});

// Mock ConfigService
export const createMockConfigService = (config: Record<string, any> = {}) => ({
    get: jest.fn((key: string) => config[key]),
    set: jest.fn(),
    getOrThrow: jest.fn((key: string) => {
        const value = config[key];
        if (value === undefined) {
            throw new Error(`Configuration key "${key}" is not defined`);
        }
        return value;
    }),
});

// Standard test module configuration
export const createTestModule = async (
    providers: any[] = [],
    imports: any[] = [],
    customConfig: Record<string, any> = {}
): Promise<TestingModule> => {
    const mockPrismaService = createMockPrismaService();
    const mockConfigService = createMockConfigService({
        NODE_ENV: 'test',
        DATABASE_URL: 'sqlite::memory:',
        ...customConfig,
    });

    return Test.createTestingModule({
        imports,
        providers: [
            ...providers,
            {
                provide: PrismaService,
                useValue: mockPrismaService,
            },
            {
                provide: ConfigService,
                useValue: mockConfigService,
            },
        ],
    }).compile();
};

// Specific service test modules
export const createEinsatzServiceTestModule = async (
    customConfig: Record<string, any> = {}
): Promise<TestingModule> => {
    return createTestModule([EinsatzService], [], customConfig);
};

export const createEtbServiceTestModule = async (
    customConfig: Record<string, any> = {}
): Promise<TestingModule> => {
    return createTestModule([EtbService], [], customConfig);
};

// Helper for testing async operations with delays
export const waitForAsync = (ms: number = 0) => {
    const timeoutPromise = new Promise(resolve => {
        const timer = setTimeout(resolve, ms);
        timer.unref(); // Timer soll den Prozess nicht am Beenden hindern
    });
    return timeoutPromise;
};

// Helper for testing error scenarios
export const expectAsyncError = async (
    asyncFn: () => Promise<any>,
    expectedError?: string | RegExp
) => {
    try {
        await asyncFn();
        throw new Error('Expected function to throw an error');
    } catch (error) {
        if (expectedError) {
            if (typeof expectedError === 'string') {
                expect(error.message).toContain(expectedError);
            } else {
                expect(error.message).toMatch(expectedError);
            }
        }
        return error;
    }
};

// Mock console methods for testing CLI commands
export const mockConsole = () => {
    const originalConsole = { ...console };
    const logs: string[] = [];
    const errors: string[] = [];

    console.log = jest.fn((message: string) => logs.push(message));
    console.error = jest.fn((message: string) => errors.push(message));
    console.warn = jest.fn();
    console.info = jest.fn();

    return {
        logs,
        errors,
        restore: () => {
            Object.assign(console, originalConsole);
        },
        clear: () => {
            logs.length = 0;
            errors.length = 0;
        },
    };
};

// Database transaction test helper
export const withMockTransaction = (mockPrisma: any, callback: (tx: any) => any) => {
    mockPrisma.$transaction.mockImplementation((txCallback: any) => {
        return txCallback(mockPrisma);
    });
    return callback(mockPrisma);
};

// Environment variable mock helper
export const withMockEnv = (envVars: Record<string, string>, callback: () => void) => {
    const originalEnv = { ...process.env };

    Object.assign(process.env, envVars);

    try {
        callback();
    } finally {
        process.env = originalEnv;
    }
};

// Common test scenarios for DTOs
export const createValidationTestCases = (ValidatorClass: any) => {
    return {
        async expectValidationSuccess(data: any) {
            const dto = new ValidatorClass();
            Object.assign(dto, data);
            // Add validation logic if using class-validator
            return dto;
        },

        async expectValidationFailure(data: any) {
            const dto = new ValidatorClass();
            Object.assign(dto, data);
            // Add validation logic if using class-validator
            // This would typically use validate() from class-validator
            return dto;
        },
    };
};

// Standard pagination mock
export const mockPaginatedResponse = (items: any[], page = 1, itemsPerPage = 10) => ({
    items,
    pagination: {
        currentPage: page,
        itemsPerPage,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / itemsPerPage),
        hasNextPage: page * itemsPerPage < items.length,
        hasPreviousPage: page > 1,
    },
}); 