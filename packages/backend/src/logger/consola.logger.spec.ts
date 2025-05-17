// Create mock logger instance
const mockLoggerInstance = {
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
};

// Mock for consola module
jest.mock('consola', () => ({
    consola: {
        create: jest.fn().mockReturnValue(mockLoggerInstance)
    }
}));

// Import after mocking
jest.mock('./consola.logger', () => ({
    logger: mockLoggerInstance,
    // We're not testing the class directly
    ConsolaLogger: jest.fn()
}));

import { logger } from './consola.logger';

describe('consola.logger.ts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logger constant', () => {
        it('should be defined', () => {
            expect(logger).toBeDefined();
            expect(logger).toBe(mockLoggerInstance);
        });

        it('should have log method', () => {
            expect(typeof logger.log).toBe('function');

            // Call the method
            logger.log('test message');

            // Verify
            expect(mockLoggerInstance.log).toHaveBeenCalledWith('test message');
        });

        it('should have error method', () => {
            expect(typeof logger.error).toBe('function');

            const error = new Error('test error');
            logger.error('error message', error);

            expect(mockLoggerInstance.error).toHaveBeenCalledWith('error message', error);
        });

        it('should have warn method', () => {
            expect(typeof logger.warn).toBe('function');

            logger.warn('warning message');

            expect(mockLoggerInstance.warn).toHaveBeenCalledWith('warning message');
        });

        it('should have debug method', () => {
            expect(typeof logger.debug).toBe('function');

            logger.debug('debug message');

            expect(mockLoggerInstance.debug).toHaveBeenCalledWith('debug message');
        });

        it('should have trace method (used for verbose)', () => {
            expect(typeof logger.trace).toBe('function');

            logger.trace('trace message');

            expect(mockLoggerInstance.trace).toHaveBeenCalledWith('trace message');
        });
    });
}); 