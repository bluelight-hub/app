import { Result } from '@domain/common/result';
import { ErinnerungErledigtEvent } from '@domain/events/erinnerung-erledigt.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungErledigtEventHandler } from '../erinnerung-erledigt.handler';

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
 */
let cuidCounter = 1000;
function generateTestCuid(): string {
  return `ctest${String(cuidCounter++).padStart(20, '0')}`;
}

/**
 * Generiert eine deterministische Test-UUID v4.
 */
let uuidCounter = 1000;
function generateTestUuid(): string {
  const counter = String(uuidCounter++).padStart(12, '0');
  return `${counter.slice(0, 8)}-${counter.slice(8, 12)}-4000-8000-000000000000`;
}

/**
 * Erstellt ein Test-ErinnerungErledigtEvent mit allen erforderlichen Daten.
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: string;
    einsatzId: string;
    erledigtAm: Date;
    erledigtBy: string;
    titel: string;
    erledigungsNotiz: string | null;
  }> = {},
): ErinnerungErledigtEvent {
  return new ErinnerungErledigtEvent(
    { toString: () => overrides.erinnerungId ?? generateTestCuid() } as never,
    { toString: () => overrides.einsatzId ?? generateTestUuid() } as never,
    overrides.erledigtAm ?? new Date('2026-01-20T14:30:00.000Z'),
    { toString: () => overrides.erledigtBy ?? generateTestCuid() } as never,
    overrides.titel ?? 'Test-Erinnerung',
    overrides.erledigungsNotiz ?? null,
  );
}

describe('ErinnerungErledigtEventHandler (Story 2.5 AC4)', () => {
  let handler: ErinnerungErledigtEventHandler;
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

    // Mock Logger (ILogger interface)
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<typeof mockLogger>;

    // Clear mocks AFTER initialization
    jest.clearAllMocks();

    // Handler mit Mocks instanziieren
    handler = new ErinnerungErledigtEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag fuer Erinnerung-Erledigung erstellen', () => {
    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' erledigt: -" (ohne Notiz)', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        erledigungsNotiz: null,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      // Template: "Erinnerung '{titel}' erledigt: {notiz}" - ohne Notiz wird '-' als Default verwendet
      expect(receivedCommand.text).toBe("Erinnerung 'Lagebesprechung' erledigt: -");
    });

    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' erledigt: {notiz}" (mit Notiz)', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        erledigungsNotiz: 'Aufgabe erfolgreich abgeschlossen',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe("Erinnerung 'Lagebesprechung' erledigt: Aufgabe erfolgreich abgeschlossen");
    });

    it('should set kategorie to ERINNERUNG', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.kategorie).toBe('ERINNERUNG');
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

    it('should pass erledigtBy as userId to ETB command', async () => {
      // Given (Arrange)
      const erledigtBy = generateTestCuid();
      const event = createTestEvent({ erledigtBy });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.userId).toBe(erledigtBy);
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

    it('should include metadata with event details (without notiz)', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const erledigtAm = new Date('2026-01-20T15:00:00.000Z');
      const erledigtBy = generateTestCuid();
      const event = createTestEvent({
        erinnerungId,
        erledigtAm,
        erledigtBy,
        titel: 'Funkueberpruefung',
        erledigungsNotiz: null,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungErledigt',
        erinnerungId,
        erledigtAm: erledigtAm.toISOString(),
        erledigtBy,
        erledigungsNotiz: null,
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungErledigt',
          }),
        }),
      );
    });

    it('should include metadata with event details (with notiz)', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const erledigtAm = new Date('2026-01-20T15:00:00.000Z');
      const erledigtBy = generateTestCuid();
      const event = createTestEvent({
        erinnerungId,
        erledigtAm,
        erledigtBy,
        titel: 'Funkueberpruefung',
        erledigungsNotiz: 'Alle Funkgeraete geprueft',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungErledigt',
        erinnerungId,
        erledigtAm: erledigtAm.toISOString(),
        erledigtBy,
        erledigungsNotiz: 'Alle Funkgeraete geprueft',
      });
    });
  });

  describe('AC2: Logging bei erfolgreicher Erstellung', () => {
    it('should call Logger.log() at start of processing', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungErledigt'), 'ErinnerungErledigtEventHandler');
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungErledigt.*titel=Lagebesprechung/), 'ErinnerungErledigtEventHandler');
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

  describe('AC3: Fire-and-Forget - Validation', () => {
    it('should early exit and log error when titel is empty', async () => {
      // Given (Arrange) - Event mit leerem titel
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungErledigt event has missing required fields/), 'ErinnerungErledigtEventHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should NOT throw when required fields are missing (Fire-and-Forget)', async () => {
      // Given (Arrange) - Fire-and-Forget Pattern garantiert keine Exception
      const event = createTestEvent({ titel: '' });

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });

  describe('AC4: Fire-and-Forget - Handler-Fehler', () => {
    it('should call Logger.error() when AddEintragHandler.execute() returns failure', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Repository save failed'));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to add ETB entry for ErinnerungErledigt.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungErledigtEventHandler',
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

  describe('AC5: Fire-and-Forget - Unerwartete Fehler', () => {
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
      expect(errorCall[1]).toBe('ErinnerungErledigtEventHandler');
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
      expect(errorLogCall[1]).toBe('ErinnerungErledigtEventHandler');
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
        'ErinnerungErledigtEventHandler',
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

  describe('Event Data Extraction', () => {
    it('should extract all event properties correctly', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const erinnerungId = generateTestCuid();
      const erledigtBy = generateTestCuid();
      const erledigtAm = new Date('2026-01-20T16:00:00.000Z');

      const specificEvent = createTestEvent({
        einsatzId,
        erinnerungId,
        erledigtBy,
        erledigtAm,
        titel: 'Wichtige Erinnerung',
        erledigungsNotiz: 'Vollstaendig erledigt',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(specificEvent);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(einsatzId);
      expect(receivedCommand.einsatzId).toBe(einsatzId);
      expect(receivedCommand.userId).toBe(erledigtBy);
      expect(receivedCommand.text).toBe("Erinnerung 'Wichtige Erinnerung' erledigt: Vollstaendig erledigt");
      expect(receivedCommand.metadata.erinnerungId).toBe(erinnerungId);
      expect(receivedCommand.metadata.erledigtAm).toBe(erledigtAm.toISOString());
      expect(receivedCommand.metadata.erledigtBy).toBe(erledigtBy);
      expect(receivedCommand.metadata.erledigungsNotiz).toBe('Vollstaendig erledigt');
    });

    it('should handle titel with special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: "Lagebesprechung (Führung) - 'dringend'",
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain("Lagebesprechung (Führung) - 'dringend'");
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
        titel: 'Führungsübergabe',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('Führungsübergabe');
    });

    it('should handle empty string notiz as falsy value (no notiz)', async () => {
      // Given (Arrange) - Leerer String ist falsy und wird wie null behandelt
      const event = createTestEvent({
        titel: 'Test',
        erledigungsNotiz: '', // Leerer String -> wird als "keine Notiz" interpretiert
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Leerer String wird als '-' Default verwendet
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe("Erinnerung 'Test' erledigt: -");
    });
  });

  describe('ETB Entry Text Format Validation', () => {
    it('should validate exact format "Erinnerung \'{titel}\' erledigt: -" (ohne Notiz)', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
        erledigungsNotiz: null,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      // Template: "Erinnerung '{titel}' erledigt: {notiz}" - ohne Notiz wird '-' als Default verwendet
      const expectedText = "Erinnerung 'Funkueberpruefung' erledigt: -";
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Erinnerung '.+' erledigt: .+$/);
    });

    it('should validate exact format "Erinnerung \'{titel}\' erledigt: {notiz}" (mit Notiz)', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
        erledigungsNotiz: 'Alles in Ordnung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      const expectedText = "Erinnerung 'Funkueberpruefung' erledigt: Alles in Ordnung";
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Erinnerung '.+' erledigt: .+$/);
    });
  });
});
