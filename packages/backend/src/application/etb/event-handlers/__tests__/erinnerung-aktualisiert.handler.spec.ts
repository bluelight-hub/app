// @ts-nocheck
import { Result } from '@domain/common/result';
import { ErinnerungAktualisiertEvent, type ErinnerungAenderungen } from '@domain/events/erinnerung-aktualisiert.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungAktualisiertEventHandler } from '../erinnerung-aktualisiert.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
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
 * Erstellt ein Test-ErinnerungAktualisiertEvent mit allen erforderlichen Daten.
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: string;
    einsatzId: string;
    aenderungen: ErinnerungAenderungen;
    aktualisierVon: string;
    titel: string;
  }> = {},
): ErinnerungAktualisiertEvent {
  return new ErinnerungAktualisiertEvent(
    { toString: () => overrides.erinnerungId ?? generateTestCuid() } as never,
    { toString: () => overrides.einsatzId ?? generateTestUuid() } as never,
    overrides.aenderungen ?? { titel: 'Neuer Titel' },
    { toString: () => overrides.aktualisierVon ?? generateTestCuid() } as never,
    overrides.titel ?? 'Test-Erinnerung',
  );
}

describe('ErinnerungAktualisiertEventHandler (Story 1.3 AC5)', () => {
  let handler: ErinnerungAktualisiertEventHandler;
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
    handler = new ErinnerungAktualisiertEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag fuer Erinnerung-Aktualisierung erstellen', () => {
    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' aktualisiert"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe("Erinnerung 'Lagebesprechung' aktualisiert");
    });

    it('should set kategorie to SYSTEM', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.kategorie).toBe('SYSTEM');
    });

    it('should pass einsatzId from event to ETB command', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const event = createTestEvent({ einsatzId });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.einsatzId).toBe(einsatzId);
    });

    it('should pass aktualisierVon as userId to ETB command', async () => {
      // Given (Arrange)
      const aktualisierVon = generateTestCuid();
      const event = createTestEvent({ aktualisierVon });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.userId).toBe(aktualisierVon);
    });

    it('should set etbId equal to einsatzId (1:1 relationship)', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const event = createTestEvent({ einsatzId });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.etbId).toBe(einsatzId);
    });

    it('should include metadata with event details including aenderungen', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const aenderungen: ErinnerungAenderungen = {
        titel: 'Neuer Titel',
        beschreibung: 'Neue Beschreibung',
        faelligAm: new Date('2026-01-25T10:00:00.000Z'),
      };
      const event = createTestEvent({
        erinnerungId,
        aenderungen,
        titel: 'Funkueberpruefung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungAktualisiert',
        erinnerungId,
        aenderungen,
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungAktualisiert',
          }),
        }),
      );
    });
  });

  describe('AC2: Logging bei erfolgreicher Erstellung', () => {
    it('should call Logger.log() at start of processing', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungAktualisiert'), 'ErinnerungAktualisiertEventHandler');
    });

    it('should call Logger.log() with success message on successful creation', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungAktualisiert.*titel=Lagebesprechung/), 'ErinnerungAktualisiertEventHandler');
    });

    it('should log both start and success messages when creation succeeds', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC3: Validation - Error und Early Exit bei fehlenden Pflichtfeldern', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given (Arrange) - Event mit leerem titel
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit (keine Verarbeitung)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungAktualisiert event has missing required fields/), 'ErinnerungAktualisiertEventHandler');
      // Handler sollte NICHT fortfahren (Early Exit)
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should NOT call Logger.error() for validation when titel is present', async () => {
      // Given (Arrange) - Event mit vollstaendigem Titel
      const event = createTestEvent({
        titel: 'Lagebesprechung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Kein Validation-Error wenn Titel vorhanden (nur Start-Log und Success-Log)
      expect(mockLogger.error).not.toHaveBeenCalled();
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
        expect.stringMatching(/Failed to add ETB entry for ErinnerungAktualisiert.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungAktualisiertEventHandler',
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
      expect(errorCall[1]).toBe('ErinnerungAktualisiertEventHandler');
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
      expect(errorLogCall[1]).toBe('ErinnerungAktualisiertEventHandler');
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
        'ErinnerungAktualisiertEventHandler',
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
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

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
      const aktualisierVon = generateTestCuid();
      const aenderungen: ErinnerungAenderungen = {
        titel: 'Geaenderter Titel',
        faelligAm: new Date('2026-01-30T12:00:00.000Z'),
      };

      const specificEvent = createTestEvent({
        einsatzId,
        erinnerungId,
        aktualisierVon,
        aenderungen,
        titel: 'Wichtige Erinnerung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(specificEvent);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.etbId).toBe(einsatzId);
      expect(receivedCommand.einsatzId).toBe(einsatzId);
      expect(receivedCommand.userId).toBe(aktualisierVon);
      expect(receivedCommand.text).toBe("Erinnerung 'Wichtige Erinnerung' aktualisiert");
      expect(receivedCommand.metadata).toMatchObject({
        erinnerungId,
        aenderungen,
      });
    });

    it('should handle titel with special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: "Lagebesprechung (Führung) - 'dringend'",
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toContain("Lagebesprechung (Führung) - 'dringend'");
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events without interference', async () => {
      // Given (Arrange)
      const event1 = createTestEvent({ titel: 'Erinnerung 1' });
      const event2 = createTestEvent({ titel: 'Erinnerung 2' });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

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

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act & Assert)
      await expect(handler.handle(minimalEvent)).resolves.toBeUndefined();
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('should handle titel with umlauts and special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Führungsübergabe',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toContain('Führungsübergabe');
    });

    it('should handle aenderungen with various field combinations', async () => {
      // Given (Arrange)
      const testCases: ErinnerungAenderungen[] = [
        { titel: 'Nur Titel' },
        { beschreibung: 'Nur Beschreibung' },
        { faelligAm: new Date('2026-02-01T08:00:00.000Z') },
        { titel: 'Alle', beschreibung: 'Felder', faelligAm: new Date('2026-02-01T08:00:00.000Z') },
        { beschreibung: null }, // Beschreibung entfernen
      ];

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When & Then (Act & Assert)
      for (const aenderungen of testCases) {
        const event = createTestEvent({ aenderungen });
        await handler.handle(event);
      }

      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(testCases.length);
    });
  });

  describe('ETB Entry Text Format Validation', () => {
    it('should validate exact format "Erinnerung \'{titel}\' aktualisiert"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      const expectedText = "Erinnerung 'Funkueberpruefung' aktualisiert";
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Erinnerung '.+' aktualisiert$/);
    });
  });
});
