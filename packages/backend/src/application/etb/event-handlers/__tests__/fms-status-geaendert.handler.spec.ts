import { Result } from '@domain/common/result';
import { FmsStatusGeaendertEvent } from '@domain/kraefte/events/fms-status-geaendert.event';
import { FMS_STATUS_LABELS } from '@domain/kraefte/constants/einsatz-fahrzeug-validation.constants';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { FmsStatusGeaendertEventHandler } from '../fms-status-geaendert.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'c';
    for (let i = 0; i < 24; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

/**
 * Generiert eine Test-CUID mit korrektem Format.
 * Format: 25 Zeichen, beginnt mit 'c', nur lowercase a-z und 0-9.
 */
function generateTestCuid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'c';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generiert eine Test-UUID v4.
 */
function generateTestUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Erstellt ein Test-FmsStatusGeaendertEvent mit allen erforderlichen Daten.
 *
 * @param overrides - Optional: Teilweise Ueberschreibungen der Default-Werte
 */
function createTestEvent(
  overrides: Partial<{
    einsatzFahrzeugId: string;
    einsatzId: string;
    funkrufname: string;
    previousStatus: number;
    neuerStatus: number;
    geaendertVon: string;
  }> = {},
): FmsStatusGeaendertEvent {
  return new FmsStatusGeaendertEvent(
    overrides.einsatzFahrzeugId ?? generateTestCuid(),
    overrides.einsatzId ?? generateTestUuid(),
    overrides.funkrufname ?? 'Florian 1/46',
    overrides.previousStatus ?? 2,
    overrides.neuerStatus ?? 4,
    overrides.geaendertVon ?? generateTestCuid(),
  );
}

describe('FmsStatusGeaendertEventHandler', () => {
  let handler: FmsStatusGeaendertEventHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AddEintragHandler
    mockAddEintragHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddEintragHandler>;

    // Mock Logger (ILogger interface)
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Handler mit Mocks instanziieren (inkl. Logger via DI)
    handler = new FmsStatusGeaendertEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte AddEintragHandler.execute() mit korrektem Command aufrufen', () => {
    it('should call AddEintragHandler.execute() with command containing correct text format', async () => {
      // Arrange
      const event = createTestEvent({
        funkrufname: 'Florian 1/46',
        previousStatus: 2,
        neuerStatus: 4,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe(`Fahrzeug Florian 1/46 Status: ${FMS_STATUS_LABELS[2]} → ${FMS_STATUS_LABELS[4]}`);
    });

    it('should use status label lookup for all status codes', async () => {
      // Arrange
      const event = createTestEvent({
        previousStatus: 0,
        neuerStatus: 9,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain(FMS_STATUS_LABELS[0]); // 'Nicht einsatzbereit'
      expect(receivedCommand.text).toContain(FMS_STATUS_LABELS[9]); // 'Regional 9'
    });

    it('should set kategorie to FAHRZEUG', async () => {
      // Arrange
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.kategorie).toBe('FAHRZEUG');
    });

    it('should pass einsatzId from event to ETB command', async () => {
      // Arrange
      const einsatzId = generateTestUuid();
      const event = createTestEvent({ einsatzId });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.einsatzId).toBe(einsatzId);
    });

    it('should pass geaendertVon as userId to ETB command', async () => {
      // Arrange
      const geaendertVon = generateTestCuid();
      const event = createTestEvent({ geaendertVon });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.userId).toBe(geaendertVon);
    });

    it('should set etbId equal to einsatzId (1:1 relationship)', async () => {
      // Arrange
      const einsatzId = generateTestUuid();
      const event = createTestEvent({ einsatzId });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(einsatzId);
    });

    it('should include metadata with event details', async () => {
      // Arrange
      const event = createTestEvent({
        einsatzFahrzeugId: generateTestCuid(),
        previousStatus: 2,
        neuerStatus: 4,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'FmsStatusGeaendert',
        einsatzFahrzeugId: event.einsatzFahrzeugId,
        previousStatus: event.previousStatus,
        neuerStatus: event.neuerStatus,
      });
    });
  });

  describe('AC2: Handler sollte bei erfolgreicher Erstellung Logger.log() aufrufen', () => {
    it('should call Logger.log() at start of processing', async () => {
      // Arrange
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Creating ETB entry for FmsStatusGeaendert',
        expect.objectContaining({
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          funkrufname: event.funkrufname,
          previousStatus: event.previousStatus,
          neuerStatus: event.neuerStatus,
        }),
      );
    });

    it('should call Logger.log() with success message on successful creation', async () => {
      // Arrange
      const event = createTestEvent({
        funkrufname: 'Florian 1/46',
        previousStatus: 2,
        neuerStatus: 4,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'ETB entry created for FmsStatusGeaendert',
        expect.objectContaining({
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          funkrufname: event.funkrufname,
          previousStatus: `${FMS_STATUS_LABELS[2]} (2)`,
          neuerStatus: `${FMS_STATUS_LABELS[4]} (4)`,
        }),
      );
    });

    it('should log both start and success messages when creation succeeds', async () => {
      // Arrange
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC3: Handler sollte bei Command-Erstellung-Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() when AddEintragCommand.create() fails', async () => {
      // Arrange
      const event = createTestEvent();

      // Mock execute um Command.create Fehler zu simulieren
      // (In der realen Implementierung wird dies über Command.create() getriggert)
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('etbId is required'));

      // Act
      await handler.handle(event);

      // Assert
      // Der Handler sollte den Fehler loggen aber nicht propagieren
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('AC4: Handler sollte bei Handler-Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() when AddEintragHandler.execute() returns failure', async () => {
      // Arrange
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Repository save failed'));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to add ETB entry for FmsStatusGeaendert',
        expect.objectContaining({
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          error: 'Repository save failed',
        }),
      );
    });

    it('should NOT call Logger.log() success message on failure', async () => {
      // Arrange
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Some error'));

      // Act
      await handler.handle(event);

      // Assert
      // Nur Start-Log (1x), kein Success-Log
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC5: Handler sollte bei unerwartetem Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() when AddEintragHandler.execute() throws', async () => {
      // Arrange
      const event = createTestEvent();
      const unexpectedError = new Error('Database connection failed');

      mockAddEintragHandler.execute.mockRejectedValue(unexpectedError);

      // Act
      await handler.handle(event);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'CRITICAL: Unexpected error during ETB entry creation for FmsStatusGeaendert',
        expect.objectContaining({
          einsatzId: event.einsatzId,
          einsatzFahrzeugId: event.einsatzFahrzeugId,
          funkrufname: event.funkrufname,
          error: 'Database connection failed',
          stack: expect.any(String),
          severity: 'CRITICAL',
          actionRequired: 'Manual ETB entry may be needed',
        }),
      );
    });

    it('should include stack trace in error log', async () => {
      // Arrange
      const event = createTestEvent();
      const unexpectedError = new Error('Unexpected failure');

      mockAddEintragHandler.execute.mockRejectedValue(unexpectedError);

      // Act
      await handler.handle(event);

      // Assert
      const errorLogCall = mockLogger.error.mock.calls[0];
      expect(errorLogCall[1]).toHaveProperty('stack');
      expect(errorLogCall[1].stack).toBeDefined();
    });

    it('should handle non-Error thrown objects gracefully', async () => {
      // Arrange
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockRejectedValue('String error');

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'CRITICAL: Unexpected error during ETB entry creation for FmsStatusGeaendert',
        expect.objectContaining({
          error: 'String error',
          severity: 'CRITICAL',
          actionRequired: 'Manual ETB entry may be needed',
        }),
      );
    });
  });

  describe('AC6: Handler sollte NIEMALS Exceptions werfen (Fire-and-Forget)', () => {
    it('should NOT throw when AddEintragHandler.execute() throws', async () => {
      // Arrange
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal error'));

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should NOT throw when AddEintragHandler returns failure', async () => {
      // Arrange
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Some error'));

      // Act & Assert
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should return void (undefined) in all scenarios', async () => {
      // Arrange: Erfolgs-Szenario
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      const result = await handler.handle(event);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('AC7: Handler sollte Event Properties korrekt extrahieren', () => {
    it('should extract funkrufname from event correctly', async () => {
      // Arrange
      const specificFunkrufname = 'Florian Hamburg 12/34';
      const event = createTestEvent({ funkrufname: specificFunkrufname });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain(specificFunkrufname);
    });

    it('should extract status codes and convert to labels correctly', async () => {
      // Arrange
      const event = createTestEvent({
        previousStatus: 1,
        neuerStatus: 3,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe(`Fahrzeug ${event.funkrufname} Status: ${FMS_STATUS_LABELS[1]} → ${FMS_STATUS_LABELS[3]}`);
    });

    it('should handle all FMS status codes (0-9)', async () => {
      // Arrange & Act
      for (let status = 0; status <= 9; status++) {
        jest.clearAllMocks();
        const event = createTestEvent({
          previousStatus: 2,
          neuerStatus: status,
        });

        mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

        await handler.handle(event);

        const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
        expect(receivedCommand.text).toContain(FMS_STATUS_LABELS[status]);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events without interference', async () => {
      // Arrange
      const event1 = createTestEvent();
      const event2 = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event1);
      await handler.handle(event2);

      // Assert
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledTimes(4); // 2 Start + 2 Success
    });

    it('should process event with minimal valid data', async () => {
      // Arrange
      const minimalEvent = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act & Assert
      await expect(handler.handle(minimalEvent)).resolves.toBeUndefined();
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle status transitions between same values', async () => {
      // Arrange
      const event = createTestEvent({
        previousStatus: 2,
        neuerStatus: 2,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe(`Fahrzeug ${event.funkrufname} Status: ${FMS_STATUS_LABELS[2]} → ${FMS_STATUS_LABELS[2]}`);
    });

    it('should handle funkrufname with special characters', async () => {
      // Arrange
      const event = createTestEvent({
        funkrufname: 'Florian München 1/23-45 (LF)',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // Act
      await handler.handle(event);

      // Assert
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('Florian München 1/23-45 (LF)');
    });
  });

  describe('Fire-and-Forget Resilience', () => {
    it('should NOT throw exception on AddEintragHandler failure', async () => {
      // Given (Arrange) - AddEintragHandler wirft Exception
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Database connection failed'));

      // When (Act & Assert) - Fire-and-Forget: keine Exception propagieren
      await expect(handler.handle(event)).resolves.not.toThrow();

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should log error when AddEintragHandler returns failure Result', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('ETB konnte nicht erstellt werden'));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Bei Failure-Result wird error geloggt
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log warning but continue processing when funkrufname is undefined', async () => {
      // Given (Arrange) - Event mit undefined funkrufname (Defense-in-Depth für korrupte Event-Daten)
      const corruptedEvent = new FmsStatusGeaendertEvent(
        generateTestCuid(), // einsatzFahrzeugId
        generateTestUuid(), // einsatzId
        // biome-ignore lint/suspicious/noExplicitAny: Test validates handling of corrupted event data
        undefined as any, // funkrufname: undefined (corrupt data - sollte durch Domain validiert sein)
        2, // previousStatus
        4, // neuerStatus
        generateTestCuid(), // geaendertVon
      );
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act) - Fire-and-Forget Handler verarbeitet Event
      await handler.handle(corruptedEvent);

      // Then (Assert)
      // 1. Warning wird geloggt für Monitoring/Alerting
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'FmsStatusGeaendertEvent has undefined funkrufname - possible corrupted data',
        expect.objectContaining({
          einsatzId: corruptedEvent.einsatzId,
          einsatzFahrzeugId: corruptedEvent.einsatzFahrzeugId,
        }),
      );

      // 2. Processing setzt fort (Fire-and-Forget: keine Exception)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);

      // 3. ETB-Text enthält "undefined" string (sichtbar für Operator zur manuellen Korrektur)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('undefined');
    });

    it('should handle edge case with null neuerStatus gracefully', async () => {
      // Given (Arrange)
      const corruptedEvent = new FmsStatusGeaendertEvent(
        generateTestCuid(), // einsatzFahrzeugId
        generateTestUuid(), // einsatzId
        'Florian 1/46', // funkrufname
        2, // previousStatus
        // biome-ignore lint/suspicious/noExplicitAny: Test validates handling of corrupted event data with null status
        null as any, // neuerStatus: null (corrupt data)
        generateTestCuid(), // geaendertVon
      );
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act & Assert) - Fire-and-Forget: keine Exception werfen
      await expect(handler.handle(corruptedEvent)).resolves.not.toThrow();

      // Then (Assert) - Handler should NOT process due to validation (returns early)
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid FMS status codes in event',
        expect.objectContaining({
          einsatzId: corruptedEvent.einsatzId,
          einsatzFahrzeugId: corruptedEvent.einsatzFahrzeugId,
          severity: 'ERROR',
          actionRequired: 'Check domain validation logic - invalid status codes should be rejected earlier',
        }),
      );
    });

    it('should reject invalid status code 10 (above maximum)', async () => {
      // Given (Arrange) - Status 10 ist ungültig (max: 9)
      const corruptedEvent = new FmsStatusGeaendertEvent(
        generateTestCuid(),
        generateTestUuid(),
        'Florian 1/46',
        2, // previousStatus: valid
        // biome-ignore lint/suspicious/noExplicitAny: Test validates rejection of invalid status code above maximum
        10 as any, // neuerStatus: 10 (invalid - above max)
        generateTestCuid(),
      );
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(corruptedEvent);

      // Then (Assert) - Handler should reject and log error
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid FMS status codes in event',
        expect.objectContaining({
          neuerStatus: 10,
          severity: 'ERROR',
          actionRequired: 'Check domain validation logic - invalid status codes should be rejected earlier',
        }),
      );
    });

    it('should reject invalid status code -1 (below minimum)', async () => {
      // Given (Arrange) - Status -1 ist ungültig (min: 0)
      const corruptedEvent = new FmsStatusGeaendertEvent(
        generateTestCuid(),
        generateTestUuid(),
        'Florian 1/46',
        // biome-ignore lint/suspicious/noExplicitAny: Test validates rejection of invalid status code below minimum
        -1 as any, // previousStatus: -1 (invalid - below min)
        4, // neuerStatus: valid
        generateTestCuid(),
      );
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(corruptedEvent);

      // Then (Assert) - Handler should reject and log error
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid FMS status codes in event',
        expect.objectContaining({
          previousStatus: -1,
          severity: 'ERROR',
        }),
      );
    });

    it('should reject NaN status code', async () => {
      // Given (Arrange) - NaN ist kein gültiger Status
      const corruptedEvent = new FmsStatusGeaendertEvent(
        generateTestCuid(),
        generateTestUuid(),
        'Florian 1/46',
        2, // previousStatus: valid
        // biome-ignore lint/suspicious/noExplicitAny: Test validates rejection of NaN as invalid status code
        Number.NaN as any, // neuerStatus: NaN (invalid)
        generateTestCuid(),
      );
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(corruptedEvent);

      // Then (Assert) - Handler should reject and log error
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Invalid FMS status codes in event',
        expect.objectContaining({
          neuerStatus: Number.NaN,
          severity: 'ERROR',
          actionRequired: 'Check domain validation logic - invalid status codes should be rejected earlier',
        }),
      );
    });

    it('should return void (undefined) always', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.handle(event);

      // Then (Assert) - Fire-and-Forget Handler gibt immer void zurück
      expect(result).toBeUndefined();
    });
  });

  describe('Error Message Format Validation', () => {
    it('should validate that ETB text follows exact format "Fahrzeug {name} Status: {oldLabel} → {newLabel}"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        funkrufname: 'Florian Test 99/1',
        previousStatus: 1,
        neuerStatus: 3,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      const expectedText = `Fahrzeug Florian Test 99/1 Status: ${FMS_STATUS_LABELS[1]} → ${FMS_STATUS_LABELS[3]}`;
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Fahrzeug .+ Status: .+ → .+$/);
    });

    it('should use arrow symbol "→" (not "->" or other variants)', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('→'); // Unicode arrow
      expect(receivedCommand.text).not.toContain('->'); // NOT ASCII arrow
    });
  });

  describe('FMS_STATUS_LABELS Completeness', () => {
    it('should have labels defined for all FMS status codes 0-9', () => {
      // Given (Arrange) - All valid FMS status codes
      const allStatusCodes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      // When/Then (Assert)
      for (const status of allStatusCodes) {
        expect(FMS_STATUS_LABELS[status]).toBeDefined();
        expect(typeof FMS_STATUS_LABELS[status]).toBe('string');
        expect(FMS_STATUS_LABELS[status].length).toBeGreaterThan(0);
      }
    });

    it('should have exactly 10 FMS status labels (0-9)', () => {
      // Given/When
      const labelCount = Object.keys(FMS_STATUS_LABELS).length;

      // Then (Assert)
      expect(labelCount).toBe(10);
    });

    it('should not have labels for invalid status codes (-1, 10, 11)', () => {
      // Given (Arrange) - Invalid status codes
      const invalidCodes = [-1, 10, 11, 99];

      // When/Then (Assert)
      for (const invalidCode of invalidCodes) {
        expect(FMS_STATUS_LABELS[invalidCode]).toBeUndefined();
      }
    });
  });
});
