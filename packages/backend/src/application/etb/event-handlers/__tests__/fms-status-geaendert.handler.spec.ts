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
    alterStatus: number;
    neuerStatus: number;
    geaendertVon: string;
  }> = {},
): FmsStatusGeaendertEvent {
  return new FmsStatusGeaendertEvent(
    overrides.einsatzFahrzeugId ?? generateTestCuid(),
    overrides.einsatzId ?? generateTestUuid(),
    overrides.funkrufname ?? 'Florian 1/46',
    overrides.alterStatus ?? 2,
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
    // Mock AddEintragHandler
    mockAddEintragHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddEintragHandler>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Handler mit Mocks instanziieren
    handler = new FmsStatusGeaendertEventHandler(mockAddEintragHandler);

    // Logger-Instanz durch Mock ersetzen (private property)
    (handler as unknown as { logger: typeof mockLogger }).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1: Handler sollte AddEintragHandler.execute() mit korrektem Command aufrufen', () => {
    it('should call AddEintragHandler.execute() with command containing correct text format', async () => {
      // Arrange
      const event = createTestEvent({
        funkrufname: 'Florian 1/46',
        alterStatus: 2,
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
        alterStatus: 0,
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
        alterStatus: 2,
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
        alterStatus: event.alterStatus,
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
          alterStatus: event.alterStatus,
          neuerStatus: event.neuerStatus,
        }),
      );
    });

    it('should call Logger.log() with success message on successful creation', async () => {
      // Arrange
      const event = createTestEvent({
        funkrufname: 'Florian 1/46',
        alterStatus: 2,
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
          alterStatus: `${FMS_STATUS_LABELS[2]} (2)`,
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
        'Unexpected error during ETB entry creation for FmsStatusGeaendert',
        expect.objectContaining({
          einsatzId: event.einsatzId,
          error: 'Database connection failed',
          stack: expect.any(String),
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
        'Unexpected error during ETB entry creation for FmsStatusGeaendert',
        expect.objectContaining({
          error: 'String error',
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
        alterStatus: 1,
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
          alterStatus: 2,
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
        alterStatus: 2,
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
});
