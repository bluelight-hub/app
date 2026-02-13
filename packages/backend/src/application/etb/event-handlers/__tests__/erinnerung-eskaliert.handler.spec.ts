import { Result } from '@domain/common/result';
import { ErinnerungEskaliertEvent } from '@domain/events/erinnerung-eskaliert.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungEskaliertEventHandler } from '../erinnerung-eskaliert.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

/**
 * Generiert eine deterministische Test-CUID.
 * Format: 25 Zeichen, beginnt mit 'c', nur lowercase a-z und 0-9.
 * R2-TEST3: Verwendet fixe Counter-basierte IDs statt Math.random().
 */
let cuidCounter = 1000;
function generateTestCuid(): string {
  return `ctest${String(cuidCounter++).padStart(20, '0')}`;
}

/**
 * Generiert eine deterministische Test-UUID v4.
 * R2-TEST3: Verwendet fixe Counter-basierte IDs statt Math.random().
 */
let uuidCounter = 1000;
function generateTestUuid(): string {
  const counter = String(uuidCounter++).padStart(12, '0');
  return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-4000-8000-000000000000`;
}

/**
 * Erstellt ein Mock-Objekt mit toString() Methode fuer Value Objects.
 */
function createMockValueObject(value: string): { toString(): string } {
  return { toString: () => value };
}

/**
 * Erstellt ein Test-ErinnerungEskaliertEvent mit allen erforderlichen Daten.
 *
 * @param overrides - Optional: Teilweise Ueberschreibungen der Default-Werte
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: string;
    einsatzId: string;
    eskaliertAm: Date;
    titel: string;
    erstelltVon: string;
    eskalationsPersonId: string | null;
  }> = {},
): ErinnerungEskaliertEvent {
  const erinnerungId = overrides.erinnerungId ?? generateTestCuid();
  const einsatzId = overrides.einsatzId ?? generateTestUuid();
  const erstelltVon = overrides.erstelltVon ?? generateTestCuid();
  const eskalationsPersonId = overrides.eskalationsPersonId !== undefined ? overrides.eskalationsPersonId : generateTestCuid();

  return new ErinnerungEskaliertEvent(
    createMockValueObject(erinnerungId),
    createMockValueObject(einsatzId) as unknown as import('@domain/value-objects/einsatz-id').EinsatzId,
    overrides.eskaliertAm ?? new Date('2026-01-20T14:30:00.000Z'),
    overrides.titel ?? 'Test-Erinnerung',
    createMockValueObject(erstelltVon) as unknown as import('@domain/value-objects/user-id').UserId,
    eskalationsPersonId ? (createMockValueObject(eskalationsPersonId) as unknown as import('@domain/value-objects/user-id').UserId) : null,
    erinnerungId,
  );
}

describe('ErinnerungEskaliertEventHandler', () => {
  let handler: ErinnerungEskaliertEventHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: jest.Mocked<{
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  }>;

  beforeEach(() => {
    // Reset deterministic ID counters (R2-TEST3)
    cuidCounter = 1000;
    uuidCounter = 1000;

    // Mock AddEintragHandler
    mockAddEintragHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddEintragHandler>;

    // Mock Logger (ILogger interface) - R2-TEST-M4: Include debug method
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<typeof mockLogger>;

    // Clear mocks AFTER initialization (AC6)
    jest.clearAllMocks();

    // Handler mit Mocks instanziieren
    handler = new ErinnerungEskaliertEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag fuer Erinnerung-Eskalation erstellen', () => {
    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' eskaliert an {person}"', async () => {
      // Given (Arrange)
      const eskalationsPersonId = generateTestCuid();
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        eskalationsPersonId,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe(`Erinnerung 'Lagebesprechung' eskaliert an ${eskalationsPersonId}`);
    });

    it('should use "unbekannt" when eskalationsPersonId is null', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        eskalationsPersonId: null,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe("Erinnerung 'Lagebesprechung' eskaliert an unbekannt");
    });

    it('should set kategorie to SYSTEM for erinnerung eskalation (Story 5.1 AC2)', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.kategorie).toBe('SYSTEM');
    });

    it('should pass einsatzId from event to ETB command', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const event = createTestEvent({ einsatzId });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.einsatzId).toBe(einsatzId);
    });

    it('should pass erstelltVon as userId to ETB command', async () => {
      // Given (Arrange)
      const erstelltVon = generateTestCuid();
      const event = createTestEvent({ erstelltVon });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.userId).toBe(erstelltVon);
    });

    it('should set etbId equal to einsatzId (1:1 relationship)', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const event = createTestEvent({ einsatzId });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(einsatzId);
    });

    it('should include metadata with event details', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const eskalationsPersonId = generateTestCuid();
      const eskaliertAm = new Date('2026-01-20T15:00:00.000Z');
      const event = createTestEvent({
        erinnerungId,
        eskalationsPersonId,
        eskaliertAm,
        titel: 'Funkueberpruefung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungEskaliert',
        erinnerungId,
        eskalationsPersonId,
        eskaliertAm: eskaliertAm.toISOString(),
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungEskaliert',
          }),
        }),
      );
    });

    it('should handle null eskalationsPersonId in metadata', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const eskaliertAm = new Date('2026-01-20T15:00:00.000Z');
      const event = createTestEvent({
        erinnerungId,
        eskalationsPersonId: null,
        eskaliertAm,
        titel: 'Funkueberpruefung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata.eskalationsPersonId).toBeNull();
    });
  });

  describe('AC2: Handler sollte bei erfolgreicher Erstellung Logger.log() aufrufen', () => {
    it('should call Logger.log() at start of processing', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungEskaliert'), 'ErinnerungEskaliertEventHandler');
    });

    it('should call Logger.log() with success message on successful creation', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungEskaliert.*erinnerungId=/), 'ErinnerungEskaliertEventHandler');
    });

    it('should log both start and success messages when creation succeeds', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC3: Fire-and-Forget - Handler sollte bei Command-Erstellung-Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given (Arrange) - Event mit leerem titel
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit (keine Verarbeitung)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungEskaliert event has missing required fields/), 'ErinnerungEskaliertEventHandler');
      // Handler sollte NICHT fortfahren (Early Exit)
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should NOT throw when command creation would hypothetically fail (Fire-and-Forget)', async () => {
      // Given (Arrange) - Fire-and-Forget Pattern garantiert keine Exception
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });

  describe('AC4: Fire-and-Forget - Handler sollte bei Handler-Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() when AddEintragHandler.execute() returns failure', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Repository save failed'));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to add ETB entry for ErinnerungEskaliert.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungEskaliertEventHandler',
      );
    });

    it('should NOT call Logger.log() success message on failure', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Some error'));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Nur Start-Log (1x), kein Success-Log
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should NOT throw when handler execution fails (Fire-and-Forget)', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Some error'));

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });

  describe('AC5: Fire-and-Forget - Handler sollte bei unerwartetem Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() when AddEintragHandler.execute() throws', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      const unexpectedError = new Error('Database connection failed');

      mockAddEintragHandler.execute.mockRejectedValue(unexpectedError);

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const errorCall = mockLogger.error.mock.calls[0];
      expect(errorCall[0]).toContain('CRITICAL');
      expect(errorCall[0]).toContain('Database connection failed');
      expect(errorCall[0]).toContain('severity=CRITICAL');
      expect(errorCall[0]).toContain('actionRequired=Manual ETB entry may be needed');
      expect(errorCall[1]).toBe('ErinnerungEskaliertEventHandler');
    });

    it('should include stack trace in error log', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      const unexpectedError = new Error('Unexpected failure');

      mockAddEintragHandler.execute.mockRejectedValue(unexpectedError);

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const errorLogCall = mockLogger.error.mock.calls[0];
      expect(errorLogCall[0]).toContain('stack=');
      expect(errorLogCall[1]).toBe('ErinnerungEskaliertEventHandler');
    });

    it('should handle non-Error thrown objects gracefully', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockRejectedValue('String error');

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/CRITICAL.*String error.*severity=CRITICAL.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungEskaliertEventHandler',
      );
    });

    it('should NOT throw when unexpected error occurs (Fire-and-Forget)', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal error'));

      // When (Act & Assert) - Fire-and-Forget: keine Exception propagieren
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });

  describe('AC6: Handler sollte NIEMALS Exceptions werfen (Fire-and-Forget)', () => {
    it('should NOT throw when AddEintragHandler.execute() throws', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal error'));

      // When (Act & Assert)
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should NOT throw when AddEintragHandler returns failure', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Some error'));

      // When (Act & Assert)
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should return void (undefined) in all scenarios', async () => {
      // Given (Arrange) - Erfolgs-Szenario
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.handle(event);

      // Then (Assert)
      expect(result).toBeUndefined();
    });
  });

  describe('AC7: Validation - Handler sollte fehlenden Titel als Error loggen und Early Exit', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given (Arrange) - Event mit leerem titel (korrupte Daten)
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungEskaliert event has missing required fields/), 'ErinnerungEskaliertEventHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should NOT call Logger.error() for validation when titel is present', async () => {
      // Given (Arrange) - Event mit vollstaendigem Titel
      const event = createTestEvent({
        titel: 'Lagebesprechung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Kein Validation-Error wenn Titel vorhanden
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Event Data Extraction', () => {
    it('should extract all event properties correctly', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const erinnerungId = generateTestCuid();
      const erstelltVon = generateTestCuid();
      const eskalationsPersonId = generateTestCuid();
      const eskaliertAm = new Date('2026-01-20T16:00:00.000Z');

      const specificEvent = createTestEvent({
        einsatzId,
        erinnerungId,
        erstelltVon,
        eskalationsPersonId,
        eskaliertAm,
        titel: 'Wichtige Erinnerung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(specificEvent);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(einsatzId);
      expect(receivedCommand.einsatzId).toBe(einsatzId);
      expect(receivedCommand.userId).toBe(erstelltVon);
      expect(receivedCommand.text).toContain('Wichtige Erinnerung');
      expect(receivedCommand.metadata.erinnerungId).toBe(erinnerungId);
      expect(receivedCommand.metadata.eskaliertAm).toBe(eskaliertAm.toISOString());
    });

    it('should handle titel with special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: "Lagebesprechung (Fuehrung) - 'dringend'",
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain("Lagebesprechung (Fuehrung) - 'dringend'");
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events without interference', async () => {
      // Given (Arrange)
      const event1 = createTestEvent({ titel: 'Erinnerung 1' });
      const event2 = createTestEvent({ titel: 'Erinnerung 2' });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event1);
      await handler.handle(event2);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledTimes(4); // 2 Start + 2 Success
    });

    it('should process event with minimal valid data', async () => {
      // Given (Arrange)
      const minimalEvent = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act & Assert)
      await expect(handler.handle(minimalEvent)).resolves.toBeUndefined();
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle titel with umlauts and special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Fuehrungsuebergabe',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('Fuehrungsuebergabe');
    });
  });

  describe('ETB Entry Text Format Validation', () => {
    it('should validate exact format "Erinnerung \'{titel}\' eskaliert an {person}"', async () => {
      // Given (Arrange)
      const eskalationsPersonId = 'ctest0000000000000012345';
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
        eskalationsPersonId,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      const expectedText = `Erinnerung 'Funkueberpruefung' eskaliert an ${eskalationsPersonId}`;
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Erinnerung '.+' eskaliert an .+$/);
    });
  });
});
