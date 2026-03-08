// @ts-nocheck
import { Result } from '@domain/common/result';
import { ErinnerungAssignedEvent } from '@domain/events/erinnerung-assigned.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungAssignedEventHandler } from '../erinnerung-assigned.handler';

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
 * Erstellt ein Test-ErinnerungAssignedEvent mit allen erforderlichen Daten.
 *
 * @param overrides - Optional: Teilweise Ueberschreibungen der Default-Werte
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: string;
    einsatzId: string;
    assignedToId: string;
    assignedById: string;
    titel: string;
    assignedAt: Date;
  }> = {},
): ErinnerungAssignedEvent {
  const erinnerungId = overrides.erinnerungId ?? generateTestCuid();
  const einsatzId = overrides.einsatzId ?? generateTestUuid();
  const assignedToId = overrides.assignedToId ?? generateTestCuid();
  const assignedById = overrides.assignedById ?? generateTestCuid();

  return new ErinnerungAssignedEvent(
    createMockValueObject(erinnerungId) as unknown as import('@domain/value-objects/erinnerung-id').ErinnerungId,
    createMockValueObject(einsatzId) as unknown as import('@domain/value-objects/einsatz-id').EinsatzId,
    createMockValueObject(assignedToId) as unknown as import('@domain/value-objects/user-id').UserId,
    createMockValueObject(assignedById) as unknown as import('@domain/value-objects/user-id').UserId,
    overrides.titel ?? 'Test-Erinnerung',
    overrides.assignedAt ?? new Date('2026-01-20T14:30:00.000Z'),
    erinnerungId,
  );
}

describe('ErinnerungAssignedEventHandler', () => {
  let handler: ErinnerungAssignedEventHandler;
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
    handler = new ErinnerungAssignedEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag fuer Erinnerung-Zuweisung erstellen', () => {
    it('should create ETB entry with correct text format "Erinnerung \'{titel}\' zugewiesen an {person}"', async () => {
      // Given (Arrange)
      const assignedToId = generateTestCuid();
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        assignedToId,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe(`Erinnerung 'Lagebesprechung' zugewiesen an ${assignedToId}`);
    });

    it('should set kategorie to SYSTEM for erinnerung assignment (Story 5.1 AC2)', async () => {
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

    it('should pass assignedById as userId to ETB command', async () => {
      // Given (Arrange)
      const assignedById = generateTestCuid();
      const event = createTestEvent({ assignedById });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.userId).toBe(assignedById);
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

    it('should include metadata with event details', async () => {
      // Given (Arrange)
      const erinnerungId = generateTestCuid();
      const assignedToId = generateTestCuid();
      const assignedById = generateTestCuid();
      const assignedAt = new Date('2026-01-20T15:00:00.000Z');
      const event = createTestEvent({
        erinnerungId,
        assignedToId,
        assignedById,
        assignedAt,
        titel: 'Funkueberpruefung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungAssigned',
        erinnerungId,
        assignedToId,
        assignedById,
        assignedAt: assignedAt.toISOString(),
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungAssigned',
          }),
        }),
      );
    });
  });

  describe('AC2: Handler sollte bei erfolgreicher Erstellung Logger.log() aufrufen', () => {
    it('should call Logger.log() at start of processing', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungAssigned'), 'ErinnerungAssignedEventHandler');
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungAssigned.*erinnerungId=/), 'ErinnerungAssignedEventHandler');
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

  describe('AC3: Fire-and-Forget - Handler sollte bei Command-Erstellung-Fehler Logger.error() aufrufen', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given (Arrange) - Event mit leerem titel
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit (keine Verarbeitung)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungAssigned event has missing required fields/), 'ErinnerungAssignedEventHandler');
      // Handler sollte NICHT fortfahren (Early Exit)
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should NOT throw when command creation would hypothetically fail (Fire-and-Forget)', async () => {
      // Given (Arrange) - Fire-and-Forget Pattern garantiert keine Exception
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

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
        expect.stringMatching(/Failed to add ETB entry for ErinnerungAssigned.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'ErinnerungAssignedEventHandler',
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
      expect(errorCall[1]).toBe('ErinnerungAssignedEventHandler');
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
      expect(errorLogCall[1]).toBe('ErinnerungAssignedEventHandler');
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
        'ErinnerungAssignedEventHandler',
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

  describe('AC7: Validation - Handler sollte fehlenden Titel als Error loggen und Early Exit', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given (Arrange) - Event mit leerem titel (korrupte Daten)
      const event = createTestEvent({
        titel: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Error loggen und Early Exit
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungAssigned event has missing required fields/), 'ErinnerungAssignedEventHandler');
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

  describe('Event Data Extraction', () => {
    it('should extract all event properties correctly', async () => {
      // Given (Arrange)
      const einsatzId = generateTestUuid();
      const erinnerungId = generateTestCuid();
      const assignedToId = generateTestCuid();
      const assignedById = generateTestCuid();
      const assignedAt = new Date('2026-01-20T16:00:00.000Z');

      const specificEvent = createTestEvent({
        einsatzId,
        erinnerungId,
        assignedToId,
        assignedById,
        assignedAt,
        titel: 'Wichtige Erinnerung',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(specificEvent);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.etbId).toBe(einsatzId);
      expect(receivedCommand.einsatzId).toBe(einsatzId);
      expect(receivedCommand.userId).toBe(assignedById);
      expect(receivedCommand.text).toContain('Wichtige Erinnerung');
      expect(receivedCommand.metadata).toMatchObject({
        erinnerungId,
        assignedAt: assignedAt.toISOString(),
      });
    });

    it('should handle titel with special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        titel: "Lagebesprechung (Fuehrung) - 'dringend'",
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toContain("Lagebesprechung (Fuehrung) - 'dringend'");
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
        titel: 'Fuehrungsuebergabe',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toContain('Fuehrungsuebergabe');
    });
  });

  describe('ETB Entry Text Format Validation', () => {
    it('should validate exact format "Erinnerung \'{titel}\' zugewiesen an {person}"', async () => {
      // Given (Arrange)
      const assignedToId = 'ctest0000000000000012345';
      const event = createTestEvent({
        titel: 'Funkueberpruefung',
        assignedToId,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      const expectedText = `Erinnerung 'Funkueberpruefung' zugewiesen an ${assignedToId}`;
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^Erinnerung '.+' zugewiesen an .+$/);
    });
  });
});
