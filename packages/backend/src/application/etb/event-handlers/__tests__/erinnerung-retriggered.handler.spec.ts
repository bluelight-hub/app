// @ts-nocheck
import { Result } from '@domain/common/result';
import { ErinnerungRetriggeredEvent } from '@domain/events/erinnerung-retriggered.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungRetriggeredEventHandler } from '../erinnerung-retriggered.handler';

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
 * Erstellt ein Test-ErinnerungRetriggeredEvent mit allen erforderlichen Daten.
 *
 * @param overrides - Optional: Teilweise Ueberschreibungen der Default-Werte
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: string;
    einsatzId: string;
    retriggeredAm: Date;
    titel: string;
    erstelltVon: string;
    snoozeCount: number;
    previousSnoozedAt: Date | null;
  }> = {},
): ErinnerungRetriggeredEvent {
  const erinnerungId = overrides.erinnerungId ?? generateTestCuid();
  const einsatzId = overrides.einsatzId ?? generateTestUuid();
  const erstelltVon = overrides.erstelltVon ?? generateTestCuid();

  // Beachte: previousSnoozedAt hat expliziten null check um Default von explicit null zu unterscheiden
  const previousSnoozedAt = 'previousSnoozedAt' in overrides ? overrides.previousSnoozedAt : new Date('2026-01-20T14:25:00.000Z');

  return new ErinnerungRetriggeredEvent(
    createMockValueObject(erinnerungId) as unknown as import('@domain/value-objects/erinnerung-id').ErinnerungId,
    createMockValueObject(einsatzId) as unknown as import('@domain/value-objects/einsatz-id').EinsatzId,
    overrides.retriggeredAm ?? new Date('2026-01-20T14:30:00.000Z'),
    overrides.titel ?? 'Test-Erinnerung',
    createMockValueObject(erstelltVon) as unknown as import('@domain/value-objects/user-id').UserId,
    overrides.snoozeCount ?? 1,
    previousSnoozedAt ?? null,
    erinnerungId,
  );
}

describe('ErinnerungRetriggeredEventHandler', () => {
  let handler: ErinnerungRetriggeredEventHandler;
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
    handler = new ErinnerungRetriggeredEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('Story 5.1 AC2: ETB-Eintrag Text via Template', () => {
    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' erneut ausgelöst"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        snoozeCount: 2,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe("Erinnerung 'Lagebesprechung' erneut ausgelöst");
    });

    it('should use same format regardless of snoozeCount', async () => {
      // Given (Arrange) - snoozeCount=5
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
        snoozeCount: 5,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe("Erinnerung 'Funkueberpruefung' erneut ausgelöst");
    });

    it('should handle snoozeCount=1 correctly (first re-trigger)', async () => {
      // Given (Arrange) - snoozeCount=1
      const event = createTestEvent({
        titel: 'Wichtige Erinnerung',
        snoozeCount: 1,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe("Erinnerung 'Wichtige Erinnerung' erneut ausgelöst");
    });
  });

  describe('previousSnoozedAt Handling', () => {
    it('should handle null previousSnoozedAt correctly in metadata', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Test',
        snoozeCount: 1,
        previousSnoozedAt: null,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toMatchObject({ previousSnoozedAt: null });
    });

    it('should include previousSnoozedAt as ISO string when present', async () => {
      // Given (Arrange)
      const previousSnoozedAt = new Date('2026-01-20T14:00:00.000Z');
      const event = createTestEvent({
        titel: 'Test',
        snoozeCount: 2,
        previousSnoozedAt,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toMatchObject({
        previousSnoozedAt: '2026-01-20T14:00:00.000Z',
      });
    });
  });

  describe('Fire-and-Forget: Handler sollte bei Fehler NICHT werfen', () => {
    it('should log error but NOT throw on AddEintragHandler failure', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Repository save failed'));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error geloggt, keine Exception
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to add ETB entry for ErinnerungRetriggered.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungRetriggeredEventHandler',
      );
    });

    it('should return void (undefined) even when handler execution fails', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Some error'));

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();
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
  });

  describe('CRITICAL Error Handling bei unerwarteten Exceptions', () => {
    it('should log CRITICAL error on unexpected exceptions', async () => {
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
      expect(errorCall[1]).toBe('ErinnerungRetriggeredEventHandler');
    });

    it('should include stack trace in CRITICAL error log', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      const unexpectedError = new Error('Unexpected failure');

      mockAddEintragHandler.execute.mockRejectedValue(unexpectedError);

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const errorLogCall = mockLogger.error.mock.calls[0];
      expect(errorLogCall[0]).toContain('stack=');
      expect(errorLogCall[1]).toBe('ErinnerungRetriggeredEventHandler');
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
        'ErinnerungRetriggeredEventHandler',
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

  describe('ETB Command Properties', () => {
    it('should set kategorie to SYSTEM for erinnerung retriggered (Story 5.1 AC2)', async () => {
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

    it('should pass erstelltVon as userId to ETB command', async () => {
      // Given (Arrange)
      const erstelltVon = generateTestCuid();
      const event = createTestEvent({ erstelltVon });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.userId).toBe(erstelltVon);
    });

    it('should include complete metadata with event details', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const retriggeredAm = new Date('2026-01-20T15:00:00.000Z');
      const previousSnoozedAt = new Date('2026-01-20T14:55:00.000Z');
      const event = createTestEvent({
        erinnerungId,
        retriggeredAm,
        titel: 'Funkueberpruefung',
        snoozeCount: 3,
        previousSnoozedAt,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungRetriggered',
        erinnerungId,
        retriggeredAm: retriggeredAm.toISOString(),
        snoozeCount: 3,
        previousSnoozedAt: previousSnoozedAt.toISOString(),
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungRetriggered',
          }),
        }),
      );
    });
  });

  describe('Logging', () => {
    it('should call Logger.log() at start of processing', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungRetriggered'), 'ErinnerungRetriggeredEventHandler');
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungRetriggered.*titel=Lagebesprechung/), 'ErinnerungRetriggeredEventHandler');
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

  describe('Validation', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given (Arrange) - Event mit leerem titel (korrupte Daten)
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungRetriggered event has missing required fields/), 'ErinnerungRetriggeredEventHandler');
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

      // Then (Assert) - Kein Validation-Error wenn Titel vorhanden
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events without interference', async () => {
      // Given (Arrange)
      const event1 = createTestEvent({ titel: 'Erinnerung 1', snoozeCount: 1 });
      const event2 = createTestEvent({ titel: 'Erinnerung 2', snoozeCount: 2 });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event1);
      await handler.handle(event2);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledTimes(4); // 2 Start + 2 Success
    });

    it('should handle titel with umlauts and special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Führungsübergabe',
        snoozeCount: 1,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toContain('Führungsübergabe');
    });

    it('should handle titel with quotes correctly', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: "Test 'mit' Quotes",
        snoozeCount: 1,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe("Erinnerung 'Test 'mit' Quotes' erneut ausgelöst");
    });

    it('should handle snoozeCount=0 edge case (defensive)', async () => {
      // Given (Arrange) - Sollte eigentlich nicht vorkommen, aber defensive Programmierung
      const event = createTestEvent({
        titel: 'Test',
        snoozeCount: 0,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Template wird unabhaengig von snoozeCount verwendet
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe("Erinnerung 'Test' erneut ausgelöst");
    });

    it('should handle negative snoozeCount gracefully', async () => {
      // Arrange
      const event = createTestEvent({ snoozeCount: -1 });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // Act
      await handler.handle(event);

      // Assert - sollte trotzdem funktionieren (defensive Programmierung)
      expect(mockAddEintragHandler.execute).toHaveBeenCalled();
    });

    it('should handle very large snoozeCount', async () => {
      // Arrange
      const event = createTestEvent({ snoozeCount: 999999 });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // Act
      await handler.handle(event);

      // Assert
      expect(mockAddEintragHandler.execute).toHaveBeenCalled();
    });
  });

  describe('Fire-and-Forget Resilience', () => {
    it('should return void (undefined) always', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      const result = await handler.handle(event);

      // Then (Assert) - Fire-and-Forget Handler gibt immer void zurück
      expect(result).toBeUndefined();
    });

    it('should NEVER propagate exceptions', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal crash'));

      // When (Act & Assert) - Fire-and-Forget: NIEMALS Exception propagieren
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });
});
