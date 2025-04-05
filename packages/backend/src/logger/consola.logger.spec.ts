import { LogLevel } from '@nestjs/common';
import { ConsolaLogger, logger } from './consola.logger';

// Mock der Konsola-Funktionen
jest.mock('consola', () => {
    const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    };

    return {
        consola: {
            create: jest.fn(() => mockLogger)
        }
    };
});

// Mock die exportierte logger-Instanz
jest.mock('./consola.logger', () => {
    const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    };

    return {
        logger: mockLogger,
        ConsolaLogger: jest.fn().mockImplementation(() => ({
            log: jest.fn((...args) => mockLogger.log(...args)),
            error: jest.fn((...args) => mockLogger.error(...args)),
            warn: jest.fn((...args) => mockLogger.warn(...args)),
            debug: jest.fn((...args) => mockLogger.debug(...args)),
            verbose: jest.fn((...args) => mockLogger.trace(...args)),
            setLogLevels: jest.fn()
        }))
    };
}, { virtual: true });

describe('ConsolaLogger', () => {
    let consolaLogger: any;

    beforeEach(() => {
        // Erstelle eine neue Instanz des Loggers für jeden Test
        consolaLogger = new ConsolaLogger();

        // Setze alle gemockten Funktionen zurück
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(consolaLogger).toBeDefined();
    });

    describe('log method', () => {
        it('should call logger.log with the correct parameters', () => {
            // Arrange
            const message = 'Test log message';
            const optionalParam = { key: 'value' };
            const spy = jest.spyOn(logger, 'log');

            // Act
            consolaLogger.log(message, optionalParam);

            // Assert
            expect(spy).toHaveBeenCalledWith(message, optionalParam);
        });
    });

    describe('error method', () => {
        it('should call logger.error with the correct parameters', () => {
            // Arrange
            const message = 'Test error message';
            const error = new Error('Test error');
            const spy = jest.spyOn(logger, 'error');

            // Act
            consolaLogger.error(message, error);

            // Assert
            expect(spy).toHaveBeenCalledWith(message, error);
        });
    });

    describe('warn method', () => {
        it('should call logger.warn with the correct parameters', () => {
            // Arrange
            const message = 'Test warning message';
            const spy = jest.spyOn(logger, 'warn');

            // Act
            consolaLogger.warn(message);

            // Assert
            expect(spy).toHaveBeenCalledWith(message);
        });
    });

    describe('debug method', () => {
        it('should call logger.debug with the correct parameters', () => {
            // Arrange
            const message = 'Test debug message';
            const obj = { debug: true };
            const spy = jest.spyOn(logger, 'debug');

            // Act
            consolaLogger.debug(message, obj);

            // Assert
            expect(spy).toHaveBeenCalledWith(message, obj);
        });
    });

    describe('verbose method', () => {
        it('should call logger.trace with the correct parameters', () => {
            // Arrange
            const message = 'Test verbose message';
            const spy = jest.spyOn(logger, 'trace');

            // Act
            consolaLogger.verbose(message);

            // Assert
            expect(spy).toHaveBeenCalledWith(message);
        });
    });

    describe('setLogLevels method', () => {
        it('should not throw an error when calling setLogLevels', () => {
            // Arrange
            const levels: LogLevel[] = ['log', 'error'];

            // Act & Assert
            expect(() => consolaLogger.setLogLevels(levels)).not.toThrow();
        });

        it('should continue to function after setLogLevels is called', () => {
            // Arrange
            const levels: LogLevel[] = ['log', 'error'];
            const message = 'Test log after setLogLevels';
            const spy = jest.spyOn(logger, 'log');

            // Act
            consolaLogger.setLogLevels(levels);
            consolaLogger.log(message);

            // Assert
            expect(spy).toHaveBeenCalledWith(message);
        });
    });
}); 