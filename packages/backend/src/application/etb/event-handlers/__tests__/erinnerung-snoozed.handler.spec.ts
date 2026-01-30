import { Result } from '@domain/common/result';
import { ErinnerungSnoozedEvent } from '@domain/events/erinnerung-snoozed.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungSnoozedEventHandler } from '../erinnerung-snoozed.handler';

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
 * Erstellt ein Test-ErinnerungSnoozedEvent mit allen erforderlichen Daten.
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: string;
    einsatzId: string;
    snoozedAt: Date;
    snoozedUntil: Date;
    snoozedBy: string;
    snoozeMinutes: number;
    snoozeCount: number;
    titel: string;
  }> = {},
): ErinnerungSnoozedEvent {
  const snoozedAt = overrides.snoozedAt ?? new Date('2026-01-20T14:30:00.000Z');
  const snoozeMinutes = overrides.snoozeMinutes ?? 5;
  const snoozedUntil = overrides.snoozedUntil ?? new Date(snoozedAt.getTime() + snoozeMinutes * 60 * 1000);

  return new ErinnerungSnoozedEvent(
    { toString: () => overrides.erinnerungId ?? generateTestCuid() } as never,
    { toString: () => overrides.einsatzId ?? generateTestUuid() } as never,
    snoozedAt,
    snoozedUntil,
    { toString: () => overrides.snoozedBy ?? generateTestCuid() } as never,
    snoozeMinutes,
    overrides.snoozeCount ?? 1,
    overrides.titel ?? 'Test-Erinnerung',
  );
}

describe('ErinnerungSnoozedEventHandler (Story 2.1)', () => {
  let handler: ErinnerungSnoozedEventHandler;
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
    handler = new ErinnerungSnoozedEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag fuer Erinnerung-Snooze erstellen', () => {
    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' verschoben um {dauer}"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        snoozeMinutes: 5,
        snoozeCount: 2,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe("Erinnerung 'Lagebesprechung' verschoben um 5 Minuten");
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

    it('should pass snoozedBy as userId to ETB command', async () => {
      // Given (Arrange)
      const snoozedBy = generateTestCuid();
      const event = createTestEvent({ snoozedBy });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.userId).toBe(snoozedBy);
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
      const snoozedAt = new Date('2026-01-20T15:00:00.000Z');
      const snoozedUntil = new Date('2026-01-20T15:05:00.000Z');
      const snoozedBy = generateTestCuid();
      const event = createTestEvent({
        erinnerungId,
        snoozedAt,
        snoozedUntil,
        snoozedBy,
        snoozeMinutes: 5,
        snoozeCount: 3,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungSnoozed',
        erinnerungId,
        snoozedAt: snoozedAt.toISOString(),
        snoozedUntil: snoozedUntil.toISOString(),
        snoozedBy,
        snoozeMinutes: 5,
        snoozeCount: 3,
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungSnoozed',
          }),
        }),
      );
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungSnoozed'), 'ErinnerungSnoozedEventHandler');
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungSnoozed.*titel=Lagebesprechung/), 'ErinnerungSnoozedEventHandler');
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungSnoozed event has missing required fields/), 'ErinnerungSnoozedEventHandler');
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
        expect.stringMatching(/Failed to add ETB entry for ErinnerungSnoozed.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungSnoozedEventHandler',
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
      expect(errorCall[1]).toBe('ErinnerungSnoozedEventHandler');
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
      expect(errorLogCall[1]).toBe('ErinnerungSnoozedEventHandler');
    });

    it('should handle non-Error thrown objects gracefully', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockRejectedValue('String error');

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*String error.*severity=CRITICAL.*actionRequired=Manual ETB entry may be needed/), 'ErinnerungSnoozedEventHandler');
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
      const snoozedBy = generateTestCuid();
      const snoozedAt = new Date('2026-01-20T16:00:00.000Z');
      const snoozedUntil = new Date('2026-01-20T16:10:00.000Z');

      const specificEvent = createTestEvent({
        einsatzId,
        erinnerungId,
        snoozedBy,
        snoozedAt,
        snoozedUntil,
        snoozeMinutes: 10,
        snoozeCount: 4,
        titel: 'Wichtige Erinnerung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(specificEvent);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(einsatzId);
      expect(receivedCommand.einsatzId).toBe(einsatzId);
      expect(receivedCommand.userId).toBe(snoozedBy);
      expect(receivedCommand.text).toBe("Erinnerung 'Wichtige Erinnerung' verschoben um 10 Minuten");
      expect(receivedCommand.metadata.erinnerungId).toBe(erinnerungId);
      expect(receivedCommand.metadata.snoozedAt).toBe(snoozedAt.toISOString());
      expect(receivedCommand.metadata.snoozedUntil).toBe(snoozedUntil.toISOString());
      expect(receivedCommand.metadata.snoozedBy).toBe(snoozedBy);
      expect(receivedCommand.metadata.snoozeMinutes).toBe(10);
      expect(receivedCommand.metadata.snoozeCount).toBe(4);
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
      const event1 = createTestEvent({ titel: 'Erinnerung 1', snoozeCount: 1 });
      const event2 = createTestEvent({ titel: 'Erinnerung 2', snoozeCount: 2 });

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

    it('should handle different snooze durations (1, 5, 10 minutes)', async () => {
      // Given (Arrange)
      const event1 = createTestEvent({ snoozeMinutes: 1, snoozeCount: 1 });
      const event5 = createTestEvent({ snoozeMinutes: 5, snoozeCount: 1 });
      const event10 = createTestEvent({ snoozeMinutes: 10, snoozeCount: 1 });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event1);
      await handler.handle(event5);
      await handler.handle(event10);

      // Then (Assert)
      const calls = mockAddEintragHandler.execute.mock.calls;
      expect(calls[0][0].text).toContain('1 Minuten');
      expect(calls[1][0].text).toContain('5 Minuten');
      expect(calls[2][0].text).toContain('10 Minuten');
    });
  });

  describe('ETB Entry Text Format Validation', () => {
    it('should validate exact format "Erinnerung \'{titel}\' verschoben um {dauer}"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
        snoozeMinutes: 5,
        snoozeCount: 3,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      const expectedText = "Erinnerung 'Funkueberpruefung' verschoben um 5 Minuten";
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Erinnerung '.+' verschoben um \d+ Minuten$/);
    });
  });
});
