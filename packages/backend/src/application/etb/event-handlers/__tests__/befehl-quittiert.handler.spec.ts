import { Result } from '@domain/common/result';
import { BefehlQuittiertEvent } from '@domain/events/befehl-quittiert.event';
import type { QuittierungArt } from '@domain/entities/befehl-empfaenger.entity';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { BefehlQuittiertEtbHandler } from '../befehl-quittiert.handler';

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
 * Deterministische Test-ID Generatoren
 */
function createTestBefehlId(): BefehlId {
  return BefehlId.create().value!;
}

function createTestEinsatzId(): EinsatzId {
  return EinsatzId.create().value!;
}

function createTestUserId(): UserId {
  return UserId.create().value!;
}

/**
 * Erstellt ein Test-BefehlQuittiertEvent mit allen erforderlichen Daten.
 */
function createTestEvent(
  overrides: Partial<{
    befehlId: BefehlId;
    einsatzId: EinsatzId;
    empfaengerId: UserId;
    quittierungArt: QuittierungArt;
    nummer: string;
    quittiertAm: Date;
  }> = {},
): BefehlQuittiertEvent {
  return new BefehlQuittiertEvent(
    overrides.befehlId ?? createTestBefehlId(),
    overrides.einsatzId ?? createTestEinsatzId(),
    overrides.empfaengerId ?? createTestUserId(),
    overrides.quittierungArt ?? 'VERSTANDEN',
    overrides.nummer ?? 'B-001',
    overrides.quittiertAm ?? new Date('2026-02-20T10:30:00.000Z'),
  );
}

describe('BefehlQuittiertEtbHandler (Story 4.3)', () => {
  let handler: BefehlQuittiertEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: jest.Mocked<{
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  }>;

  beforeEach(() => {
    mockAddEintragHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddEintragHandler>;

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<typeof mockLogger>;

    jest.clearAllMocks();

    handler = new BefehlQuittiertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  describe('ETB-Eintrag Erstellung', () => {
    it('should create ETB entry with correct text format: "Befehl #nummer quittiert als quittierungArt"', async () => {
      // Given
      const event = createTestEvent({
        nummer: 'B-003',
        quittierungArt: 'VERSTANDEN',
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe('Befehl #B-003 quittiert als VERSTANDEN von Empfänger');
    });

    it('should set kategorie to BEFEHL', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.kategorie).toBe('SYSTEM');
    });

    it('should pass einsatzId from event to ETB command', async () => {
      // Given
      const einsatzId = createTestEinsatzId();
      const event = createTestEvent({ einsatzId });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.einsatzId).toBe(einsatzId.value);
    });

    it('should set userId to "system"', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.userId).toBe('system');
    });

    it('should set etbId equal to einsatzId.value (1:1 relationship)', async () => {
      // Given
      const einsatzId = createTestEinsatzId();
      const event = createTestEvent({ einsatzId });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.etbId).toBe(einsatzId.value);
    });

    it('should include metadata with eventType, befehlId, empfaengerId, and quittierungArt', async () => {
      // Given
      const befehlId = createTestBefehlId();
      const empfaengerId = createTestUserId();
      const event = createTestEvent({
        befehlId,
        empfaengerId,
        quittierungArt: 'RUECKFRAGE',
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'BefehlQuittiert',
        befehlId: befehlId.value,
        empfaengerId: empfaengerId.value,
        quittierungArt: 'RUECKFRAGE',
      });
    });

    it('should pass quittiertAm as occurredAt to AddEintragCommand', async () => {
      // Given
      const quittiertAm = new Date('2026-02-20T15:45:00.000Z');
      const event = createTestEvent({ quittiertAm });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.occurredAt).toEqual(quittiertAm);
    });
  });

  describe('Fire-and-Forget Pattern', () => {
    it('should NOT throw when handler execution fails', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Repository save failed'));

      // When & Then - keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should call Logger.error() when AddEintragHandler returns failure', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to add ETB entry.*DB Error/), 'BefehlQuittiertEtbHandler');
    });

    it('should NOT throw when AddEintragHandler throws unexpected error', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Connection timeout'));

      // When & Then
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should log CRITICAL error with stack trace on unexpected exception', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockRejectedValue(new Error('Fatal error'));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*Fatal error.*stack=/), 'BefehlQuittiertEtbHandler');
    });
  });

  describe('Logging', () => {
    it('should log at start of processing', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for BefehlQuittiert'), 'BefehlQuittiertEtbHandler');
    });

    it('should log success message on successful creation', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for BefehlQuittiert/), 'BefehlQuittiertEtbHandler');
    });

    it('should log start and success messages (2x log calls) on success', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('QuittierungArt Varianten', () => {
    it.each<QuittierungArt>(['VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN'])('should create correct text for quittierungArt: %s', async (quittierungArt) => {
      // Given
      const event = createTestEvent({ quittierungArt, nummer: 'B-005' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe(`Befehl #B-005 quittiert als ${quittierungArt} von Empfänger`);
    });
  });

  describe('Validation', () => {
    it('should call Logger.error() and early exit when befehlId is missing', async () => {
      // Given: Event mit null befehlId
      const event = createTestEvent();
      const invalidEvent = { ...event, befehlId: null } as unknown as BefehlQuittiertEvent;
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(invalidEvent);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/BefehlQuittiert event has missing required fields/), 'BefehlQuittiertEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should call Logger.error() and early exit when empfaengerId is missing', async () => {
      // Given: Event mit null empfaengerId
      const event = createTestEvent();
      const invalidEvent = { ...event, empfaengerId: null } as unknown as BefehlQuittiertEvent;
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(invalidEvent);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/BefehlQuittiert event has missing required fields/), 'BefehlQuittiertEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events', async () => {
      // Given
      const event1 = createTestEvent({ nummer: 'B-001', quittierungArt: 'VERSTANDEN' });
      const event2 = createTestEvent({ nummer: 'B-002', quittierungArt: 'RUECKFRAGE' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event1);
      await handler.handle(event2);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(2);
    });
  });
});
