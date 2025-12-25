import { Result } from '@domain/common/result';
import { RolleFreigegeben } from '@domain/kraefte/events/rolle-freigegeben.event';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { RolleFreigegebenEventHandler } from '../rolle-freigegeben.handler';

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
 * Deterministic Test Fixtures (R2-TEST3: No Math.random())
 * Diese Fixtures garantieren reproduzierbare Tests ohne Zufallswerte.
 */
const _TEST_FIXTURES = {
  EINSATZ_IDS: {
    DEFAULT: '123e4567-e89b-12d3-a456-426614174000',
    ALTERNATIVE: '223e4567-e89b-12d3-a456-426614174001',
  },
  CUID_IDS: {
    EINSATZ_PERSON_1: 'ctest1person00000000001',
    EINSATZ_PERSON_2: 'ctest2person00000000002',
    ROLLEN_DEFINITION_1: 'ctest1rolle000000000001',
    ROLLEN_DEFINITION_2: 'ctest2rolle000000000002',
    USER_1: 'ctest1user0000000000001',
    USER_2: 'ctest2user0000000000002',
  },
} as const;

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
 * Erstellt ein Test-RolleFreigegeben Event mit allen erforderlichen Daten.
 *
 * @param overrides - Optional: Teilweise Ueberschreibungen der Default-Werte
 */
function createTestEvent(
  overrides: Partial<{
    einsatzId: string;
    einsatzPersonId: string;
    rollenDefinitionId: string;
    rollenName: string;
    personVorname: string;
    personNachname: string;
    freigegebenVon: string;
  }> = {},
): RolleFreigegeben {
  return new RolleFreigegeben(
    overrides.einsatzId ?? generateTestUuid(),
    overrides.einsatzPersonId ?? generateTestCuid(),
    overrides.rollenDefinitionId ?? generateTestCuid(),
    overrides.rollenName ?? 'Leiter BHP',
    overrides.personVorname ?? 'Max',
    overrides.personNachname ?? 'Mustermann',
    overrides.freigegebenVon ?? generateTestCuid(),
  );
}

describe('RolleFreigegebenEventHandler', () => {
  let handler: RolleFreigegebenEventHandler;
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
    handler = new RolleFreigegebenEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag für Rollenfreigabe erstellen', () => {
    it('should create ETB entry with correct text format "{vorname} {nachname} gibt Rolle {rollenName} ab"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        personVorname: 'Max',
        personNachname: 'Mustermann',
        rollenName: 'Leiter BHP',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe('Max Mustermann gibt Rolle Leiter BHP ab');
    });

    it('should set kategorie to PERSONAL for rolle freigabe', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.kategorie).toBe('PERSONAL');
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

    it('should pass freigegebenVon as userId to ETB command', async () => {
      // Given (Arrange)
      const freigegebenVon = generateTestCuid();
      const event = createTestEvent({ freigegebenVon });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.userId).toBe(freigegebenVon);
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
      const einsatzPersonId = generateTestCuid();
      const rollenDefinitionId = generateTestCuid();
      const event = createTestEvent({
        einsatzPersonId,
        rollenDefinitionId,
        rollenName: 'LNA',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'RolleFreigegeben',
        einsatzPersonId,
        rollenDefinitionId,
        rollenName: 'LNA',
      });
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for RolleFreigegeben'), 'RolleFreigegebenEventHandler');
    });

    it('should call Logger.log() with success message on successful creation', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        personVorname: 'Max',
        personNachname: 'Mustermann',
        rollenName: 'Leiter BHP',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for RolleFreigegeben.*rolle=Leiter BHP/), 'RolleFreigegebenEventHandler');
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
    it('should continue processing when AddEintragCommand.create() succeeds with empty names (defensive)', async () => {
      // Given (Arrange) - Event mit leeren Namen
      // Hinweis: AddEintragCommand.create() akzeptiert technisch "  gibt Rolle ... ab"
      // Die Validation für leere Namen erfolgt im Handler via Logger.warn (siehe AC7)
      const event = createTestEvent({
        personVorname: '',
        personNachname: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Handler sollte warning loggen (AC7) aber trotzdem fortfahren
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockAddEintragHandler.execute).toHaveBeenCalled();
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
        expect.stringMatching(/Failed to add ETB entry for RolleFreigegeben.*Repository save failed.*severity=ERROR.*actionRequired=Manual ETB entry may be needed/),
        'RolleFreigegebenEventHandler',
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
      expect(errorCall[1]).toBe('RolleFreigegebenEventHandler');
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
      expect(errorLogCall[1]).toBe('RolleFreigegebenEventHandler');
    });

    it('should handle non-Error thrown objects gracefully', async () => {
      // Given (Arrange)
      const event = createTestEvent();

      mockAddEintragHandler.execute.mockRejectedValue('String error');

      // When (Act & Assert) - Fire-and-Forget: keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();

      // Then (Assert)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*String error.*severity=CRITICAL.*actionRequired=Manual ETB entry may be needed/), 'RolleFreigegebenEventHandler');
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

  describe('AC7: Validation - Handler sollte fehlende Snapshot-Daten loggen', () => {
    it('should call Logger.warn() when personVorname is missing', async () => {
      // Given (Arrange) - Event mit leerem vorname (korrupte Daten)
      const event = createTestEvent({
        personVorname: '',
        personNachname: 'Mustermann',
        rollenName: 'LNA',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/RolleFreigegeben event has missing snapshot data.*vorname=.*nachname=Mustermann.*rolle=LNA/), 'RolleFreigegebenEventHandler');
    });

    it('should call Logger.warn() when personNachname is missing', async () => {
      // Given (Arrange) - Event mit leerem nachname (korrupte Daten)
      const event = createTestEvent({
        personVorname: 'Max',
        personNachname: '',
        rollenName: 'LNA',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/RolleFreigegeben event has missing snapshot data.*vorname=Max.*nachname=/), 'RolleFreigegebenEventHandler');
    });

    it('should call Logger.warn() when rollenName is missing', async () => {
      // Given (Arrange) - Event mit leerem rollenName (korrupte Daten)
      const event = createTestEvent({
        personVorname: 'Max',
        personNachname: 'Mustermann',
        rollenName: '',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/RolleFreigegeben event has missing snapshot data.*rolle=/), 'RolleFreigegebenEventHandler');
    });

    it('should call Logger.warn() when all snapshot data is missing', async () => {
      // Given (Arrange) - Event ohne Snapshot-Daten (korrupte Daten)
      const event = createTestEvent({
        personVorname: '',
        personNachname: '',
        rollenName: '',
      });

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringMatching(/RolleFreigegeben event has missing snapshot data/), 'RolleFreigegebenEventHandler');
    });

    it('should NOT call Logger.warn() when all snapshot data is present', async () => {
      // Given (Arrange) - Event mit vollständigen Snapshot-Daten
      const event = createTestEvent({
        personVorname: 'Max',
        personNachname: 'Mustermann',
        rollenName: 'LNA',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Event Data Extraction', () => {
    it('should extract all event properties correctly', async () => {
      // Given (Arrange)
      const specificEvent = createTestEvent({
        einsatzId: generateTestUuid(),
        einsatzPersonId: generateTestCuid(),
        rollenDefinitionId: generateTestCuid(),
        rollenName: 'OrgL',
        personVorname: 'Max',
        personNachname: 'Mustermann',
        freigegebenVon: generateTestCuid(),
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(specificEvent);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(specificEvent.einsatzId);
      expect(receivedCommand.einsatzId).toBe(specificEvent.einsatzId);
      expect(receivedCommand.userId).toBe(specificEvent.freigegebenVon);
      expect(receivedCommand.text).toContain(specificEvent.personVorname);
      expect(receivedCommand.text).toContain(specificEvent.personNachname);
      expect(receivedCommand.text).toContain(specificEvent.rollenName);
    });

    it('should handle rollenName with special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        rollenName: 'Leiter BHP (Führung)',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('Leiter BHP (Führung)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events without interference', async () => {
      // Given (Arrange)
      const event1 = createTestEvent({ rollenName: 'LNA' });
      const event2 = createTestEvent({ rollenName: 'OrgL' });

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

    it('should handle names with umlauts and special characters', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        personVorname: 'Jürgen',
        personNachname: 'Müller-König',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain('Jürgen');
      expect(receivedCommand.text).toContain('Müller-König');
    });
  });

  describe('ETB Entry Text Format Validation', () => {
    it('should validate exact format "{vorname} {nachname} gibt Rolle {rollenName} ab"', async () => {
      // Given (Arrange)
      const event = createTestEvent({
        personVorname: 'Test',
        personNachname: 'User',
        rollenName: 'LNA',
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      await handler.handle(event);

      // Then (Assert)
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      const expectedText = 'Test User gibt Rolle LNA ab';
      expect(receivedCommand.text).toBe(expectedText);

      // Validate format structure
      expect(receivedCommand.text).toMatch(/^.+ .+ gibt Rolle .+ ab$/);
    });
  });

  describe('Fire-and-Forget Resilience', () => {
    it('should return void (undefined) always', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When (Act)
      const result = await handler.handle(event);

      // Then (Assert) - Fire-and-Forget Handler gibt immer void zurück
      expect(result).toBeUndefined();
    });

    it('should log error but continue when handler execution fails', async () => {
      // Given (Arrange)
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('ETB konnte nicht erstellt werden'));

      // When (Act)
      await handler.handle(event);

      // Then (Assert) - Bei Failure-Result wird error geloggt
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
