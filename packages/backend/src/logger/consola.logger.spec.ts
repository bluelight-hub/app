// Mock consola BEFORE import
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
};

jest.mock('consola', () => ({
  consola: {
    create: jest.fn(() => mockLogger),
  },
}));

// Import AFTER mock
import { ConsolaLogger } from './consola.logger';

describe.skip('ConsolaLogger', () => {
  let consolaLogger: ConsolaLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    consolaLogger = new ConsolaLogger();
  });

  describe('Instanziierung', () => {
    it('sollte erfolgreich instanziiert werden', () => {
      expect(consolaLogger).toBeInstanceOf(ConsolaLogger);
    });

    it('sollte alle erforderlichen Methoden haben', () => {
      expect(typeof consolaLogger.log).toBe('function');
      expect(typeof consolaLogger.error).toBe('function');
      expect(typeof consolaLogger.warn).toBe('function');
      expect(typeof consolaLogger.debug).toBe('function');
      expect(typeof consolaLogger.verbose).toBe('function');
      expect(typeof consolaLogger.setLogLevels).toBe('function');
    });
  });

  describe('log', () => {
    it('sollte log-Nachrichten weiterleiten', () => {
      const message = 'Test log message';

      consolaLogger.log(message);

      expect(mockLogger.log).toHaveBeenCalledWith(message);
    });

    it('sollte log-Nachrichten mit Parametern weiterleiten', () => {
      const message = 'Test message';
      const param1 = { key: 'value' };
      const param2 = 'additional';

      consolaLogger.log(message, param1, param2);

      expect(mockLogger.log).toHaveBeenCalledWith(message, param1, param2);
    });
  });

  describe('error', () => {
    it('sollte error-Nachrichten weiterleiten', () => {
      const message = 'Test error message';

      consolaLogger.error(message);

      expect(mockLogger.error).toHaveBeenCalledWith(message);
    });

    it('sollte error-Nachrichten mit Error-Objekten weiterleiten', () => {
      const message = 'Error occurred';
      const error = new Error('Test error');

      consolaLogger.error(message, error);

      expect(mockLogger.error).toHaveBeenCalledWith(message, error);
    });
  });

  describe('warn', () => {
    it('sollte warn-Nachrichten weiterleiten', () => {
      const message = 'Test warning';

      consolaLogger.warn(message);

      expect(mockLogger.warn).toHaveBeenCalledWith(message);
    });

    it('sollte warn-Nachrichten mit Kontext weiterleiten', () => {
      const message = 'Warning message';
      const context = { component: 'TestComponent' };

      consolaLogger.warn(message, context);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, context);
    });
  });

  describe('debug', () => {
    it('sollte debug-Nachrichten weiterleiten', () => {
      const message = 'Debug message';

      consolaLogger.debug(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(message);
    });

    it('sollte debug-Nachrichten mit Daten weiterleiten', () => {
      const message = 'Debug info';
      const data = { requestId: '123', timestamp: new Date() };

      consolaLogger.debug(message, data);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, data);
    });
  });

  describe('verbose', () => {
    it('sollte verbose-Nachrichten als trace weiterleiten', () => {
      const message = 'Verbose message';

      consolaLogger.verbose(message);

      expect(mockLogger.trace).toHaveBeenCalledWith(message);
    });

    it('sollte verbose-Nachrichten mit Parametern als trace weiterleiten', () => {
      const message = 'Verbose info';
      const param1 = 'param1';
      const param2 = { nested: 'data' };

      consolaLogger.verbose(message, param1, param2);

      expect(mockLogger.trace).toHaveBeenCalledWith(message, param1, param2);
    });
  });

  describe('setLogLevels', () => {
    it('sollte setLogLevels ohne Fehler aufrufen', () => {
      const levels = ['error', 'warn', 'log'] as any[];

      expect(() => {
        consolaLogger.setLogLevels(levels);
      }).not.toThrow();
    });

    it('sollte setLogLevels mit leeren Array aufrufen', () => {
      expect(() => {
        consolaLogger.setLogLevels([]);
      }).not.toThrow();
    });

    it('sollte setLogLevels mit undefined aufrufen', () => {
      expect(() => {
        consolaLogger.setLogLevels(undefined as any);
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('sollte alle Logging-Methoden korrekt aufrufen', () => {
      const baseMessage = 'Test';

      consolaLogger.log(`${baseMessage} log`);
      consolaLogger.error(`${baseMessage} error`);
      consolaLogger.warn(`${baseMessage} warn`);
      consolaLogger.debug(`${baseMessage} debug`);
      consolaLogger.verbose(`${baseMessage} verbose`);

      expect(mockLogger.log).toHaveBeenCalledWith(`${baseMessage} log`);
      expect(mockLogger.error).toHaveBeenCalledWith(`${baseMessage} error`);
      expect(mockLogger.warn).toHaveBeenCalledWith(`${baseMessage} warn`);
      expect(mockLogger.debug).toHaveBeenCalledWith(`${baseMessage} debug`);
      expect(mockLogger.trace).toHaveBeenCalledWith(`${baseMessage} verbose`);
    });

    it('sollte verschiedene Datentypen handhaben', () => {
      const testCases = ['string', 123, { object: 'value' }, ['array', 'values'], null, undefined];

      testCases.forEach((testCase) => {
        consolaLogger.log(testCase);
        expect(mockLogger.log).toHaveBeenCalledWith(testCase);
      });
    });

    it('sollte als NestJS LoggerService verwendet werden können', () => {
      // Test NestJS LoggerService interface compatibility
      consolaLogger.log('App starting');
      consolaLogger.error('Critical error', 'Stack trace');
      consolaLogger.warn('Warning message');
      consolaLogger.debug('Debug information');
      consolaLogger.verbose('Verbose output');
      consolaLogger.setLogLevels(['error', 'warn']);

      expect(mockLogger.log).toHaveBeenCalledWith('App starting');
      expect(mockLogger.error).toHaveBeenCalledWith('Critical error', 'Stack trace');
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLogger.debug).toHaveBeenCalledWith('Debug information');
      expect(mockLogger.trace).toHaveBeenCalledWith('Verbose output');
    });
  });
});
