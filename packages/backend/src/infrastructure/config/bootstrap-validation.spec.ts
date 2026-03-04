import type { Logger } from '@nestjs/common';
import { validateBootstrapConfig, validateInsecureMode } from './bootstrap-validation';

/**
 * Mock Logger Type - nur die fuer validateInsecureMode benoetigten Methoden
 */
type MockLogger = Pick<typeof Logger, 'warn' | 'error'>;

describe('validateInsecureMode', () => {
  let mockLogger: {
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('Production Environment (isProduction=true)', () => {
    /**
     * Test: INSECURE_MODE=true in Production MUSS Exception werfen
     * AC5: Production Error + App Crash
     */
    it('should throw Error when INSECURE_MODE=true in production', () => {
      // Given: Production Environment mit INSECURE_MODE=true
      const insecureMode = 'true';
      const isProduction = true;

      // When & Then: Exception wird geworfen
      expect(() => validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger)).toThrow('INSECURE_MODE is not allowed in production environment');
    });

    /**
     * Test: Error Logs werden VOR Exception ausgegeben
     * AC5: Fatal Error Box mit 5 Zeilen
     */
    it('should log fatal error box before throwing in production', () => {
      // Given: Production Environment mit INSECURE_MODE=true
      const insecureMode = 'true';
      const isProduction = true;

      // When: validateInsecureMode aufgerufen wird
      try {
        validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);
      } catch (_e) {
        // Expected: Exception
      }

      // Then: Error Box wurde geloggt (5 Zeilen)
      expect(mockLogger.error).toHaveBeenCalledTimes(5);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('FATAL'), 'Bootstrap');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('INSECURE_MODE IN PRODUCTION'), 'Bootstrap');
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('APPLICATION STARTUP ABORTED'), 'Bootstrap');
    });

    /**
     * Test: INSECURE_MODE=false in Production ist OK
     * AC2: Default false funktioniert
     */
    it('should NOT throw when INSECURE_MODE=false in production', () => {
      // Given: Production Environment mit INSECURE_MODE=false
      const insecureMode = 'false';
      const isProduction = true;

      // When & Then: Keine Exception
      expect(() => validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger)).not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    /**
     * Test: INSECURE_MODE=undefined in Production ist OK
     * AC2: Secure-by-Default
     */
    it('should NOT throw when INSECURE_MODE=undefined in production', () => {
      // Given: Production Environment ohne INSECURE_MODE
      const insecureMode = undefined;
      const isProduction = true;

      // When & Then: Keine Exception
      expect(() => validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger)).not.toThrow();
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Development Environment (isProduction=false)', () => {
    /**
     * Test: INSECURE_MODE=true in Development zeigt Warning
     * AC4: Startup Warning Box
     */
    it('should log warning box when INSECURE_MODE=true in development', () => {
      // Given: Development Environment mit INSECURE_MODE=true
      const insecureMode = 'true';
      const isProduction = false;

      // When: validateInsecureMode aufgerufen wird
      validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);

      // Then: Warning Box wurde geloggt (5 Zeilen)
      expect(mockLogger.warn).toHaveBeenCalledTimes(5);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('INSECURE_MODE ACTIVE'), 'Bootstrap');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Token validation is DISABLED'), 'Bootstrap');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('DO NOT USE IN PRODUCTION'), 'Bootstrap');
    });

    /**
     * Test: INSECURE_MODE=true in Development wirft KEINE Exception
     * AC4: App startet trotz Warning
     */
    it('should NOT throw when INSECURE_MODE=true in development', () => {
      // Given: Development Environment mit INSECURE_MODE=true
      const insecureMode = 'true';
      const isProduction = false;

      // When & Then: Keine Exception
      expect(() => validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger)).not.toThrow();
    });

    /**
     * Test: INSECURE_MODE=false in Development ist still
     * AC2: Default funktioniert
     */
    it('should NOT log anything when INSECURE_MODE=false in development', () => {
      // Given: Development Environment mit INSECURE_MODE=false
      const insecureMode = 'false';
      const isProduction = false;

      // When: validateInsecureMode aufgerufen wird
      validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);

      // Then: Keine Logs
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    /**
     * Test: INSECURE_MODE=undefined in Development ist still
     * AC2: Secure-by-Default
     */
    it('should NOT log anything when INSECURE_MODE=undefined in development', () => {
      // Given: Development Environment ohne INSECURE_MODE
      const insecureMode = undefined;
      const isProduction = false;

      // When: validateInsecureMode aufgerufen wird
      validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);

      // Then: Keine Logs
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test: String 'TRUE' (uppercase) wird NICHT als true behandelt
     * Security: Strict string comparison
     */
    it('should NOT trigger when INSECURE_MODE=TRUE (uppercase)', () => {
      // Given: INSECURE_MODE mit falscher Schreibweise
      const insecureMode = 'TRUE';
      const isProduction = false;

      // When: validateInsecureMode aufgerufen wird
      validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);

      // Then: Keine Logs (=== 'true' Vergleich)
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    /**
     * Test: String '1' wird NICHT als true behandelt
     * Security: Strict string comparison
     */
    it('should NOT trigger when INSECURE_MODE=1', () => {
      // Given: INSECURE_MODE mit numerischem String
      const insecureMode = '1';
      const isProduction = false;

      // When: validateInsecureMode aufgerufen wird
      validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);

      // Then: Keine Logs (=== 'true' Vergleich)
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    /**
     * Test: Leerer String wird NICHT als true behandelt
     * Security: Strict string comparison
     */
    it('should NOT trigger when INSECURE_MODE is empty string', () => {
      // Given: INSECURE_MODE ist leer
      const insecureMode = '';
      const isProduction = false;

      // When: validateInsecureMode aufgerufen wird
      validateInsecureMode(insecureMode, isProduction, mockLogger as MockLogger);

      // Then: Keine Logs
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });
});

describe('validateBootstrapConfig', () => {
  let mockLogger: {
    log: jest.Mock;
    warn: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
    };
  });

  it('sollte DATABASE_URL und MASTER_SECRET_KEY erfolgreich validieren', () => {
    // Given
    const masterSecretKey = 'a'.repeat(64);
    const databaseUrl = 'postgresql://test:test@localhost:5432/test';

    // When
    const result = validateBootstrapConfig(
      {
        databaseUrl,
        masterSecretKey,
      },
      mockLogger as unknown as typeof Logger,
    );

    // Then
    expect(result.databaseUrl).toBe(databaseUrl);
    expect(result.masterSecretKey.length).toBe(32);
    expect(mockLogger.log).toHaveBeenCalledTimes(1);
  });

  it('sollte Fehler werfen wenn DATABASE_URL fehlt', () => {
    // Given / When / Then
    expect(() =>
      validateBootstrapConfig(
        {
          databaseUrl: undefined,
          masterSecretKey: 'a'.repeat(64),
        },
        mockLogger as unknown as typeof Logger,
      ),
    ).toThrow('DATABASE_URL ist nicht gesetzt');
  });

  it('sollte bei fehlendem MASTER_SECRET_KEY nur warnen und weiterlaufen', () => {
    // Given / When / Then
    const result = validateBootstrapConfig(
      {
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        masterSecretKey: undefined,
      },
      mockLogger as unknown as typeof Logger,
    );

    expect(result.masterSecretKey).toBe(null);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
  });

  it('sollte passphrase-basierten MASTER_SECRET_KEY akzeptieren', () => {
    // Given / When
    const result = validateBootstrapConfig(
      {
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        masterSecretKey: 'not-a-hex-key',
      },
      mockLogger as unknown as typeof Logger,
    );

    expect(result.masterSecretKey).not.toBe(null);
    expect(result.masterSecretKey?.length).toBe(32);
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
