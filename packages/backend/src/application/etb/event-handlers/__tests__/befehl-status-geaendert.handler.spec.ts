import { Result } from '@domain/common/result';
import { BefehlStatusGeaendertEvent } from '@domain/events/befehl-status-geaendert.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { BefehlStatus } from '@domain/value-objects/befehl-status';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { BefehlStatusGeaendertEtbHandler } from '../befehl-status-geaendert.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (typeof id !== 'string') return false;
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

function createTestBefehlId(): BefehlId {
  return BefehlId.create().value!;
}

function createTestEinsatzId(): EinsatzId {
  return EinsatzId.create().value!;
}

function createTestEvent(
  overrides: Partial<{
    befehlId: BefehlId;
    einsatzId: EinsatzId;
    oldStatus: BefehlStatus;
    newStatus: BefehlStatus;
    nummer: string;
  }> = {},
): BefehlStatusGeaendertEvent {
  return new BefehlStatusGeaendertEvent(
    overrides.befehlId ?? createTestBefehlId(),
    overrides.oldStatus ?? BefehlStatus.ERTEILT(),
    overrides.newStatus ?? BefehlStatus.ZUGESTELLT(),
    overrides.einsatzId ?? createTestEinsatzId(),
    overrides.nummer ?? 'B-001',
  );
}

describe('BefehlStatusGeaendertEtbHandler', () => {
  let handler: BefehlStatusGeaendertEtbHandler;
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

    handler = new BefehlStatusGeaendertEtbHandler(mockAddEintragHandler, mockLogger);
  });

  describe('ETB-Eintrag Erstellung', () => {
    it('should create ETB entry with correct text format: "Befehl #nummer: Status geändert von X auf Y"', async () => {
      // Given
      const event = createTestEvent({
        nummer: 'B-007',
        oldStatus: BefehlStatus.ERTEILT(),
        newStatus: BefehlStatus.ZUGESTELLT(),
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toBe('Befehl #B-007: Status geändert von ERTEILT auf ZUGESTELLT');
    });

    it('should set kategorie to SYSTEM', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.kategorie).toBe('SYSTEM');
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

    it('should include metadata with eventType, befehlId, oldStatus and newStatus', async () => {
      // Given
      const befehlId = createTestBefehlId();
      const event = createTestEvent({
        befehlId,
        oldStatus: BefehlStatus.ZUGESTELLT(),
        newStatus: BefehlStatus.QUITTIERT(),
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.metadata).toEqual({
        eventType: 'BefehlStatusGeaendert',
        befehlId: befehlId.value,
        oldStatus: 'ZUGESTELLT',
        newStatus: 'QUITTIERT',
      });
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

    it('should pass occurredAt from event to AddEintragCommand', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.occurredAt).toEqual(event.occurredAt);
    });
  });

  describe('Status-Transition Varianten', () => {
    it.each([
      { old: 'ERTEILT', new: 'ZUGESTELLT', oldFactory: BefehlStatus.ERTEILT, newFactory: BefehlStatus.ZUGESTELLT },
      { old: 'ZUGESTELLT', new: 'QUITTIERT', oldFactory: BefehlStatus.ZUGESTELLT, newFactory: BefehlStatus.QUITTIERT },
      { old: 'ERTEILT', new: 'KORRIGIERT', oldFactory: BefehlStatus.ERTEILT, newFactory: BefehlStatus.KORRIGIERT },
    ])('should create correct text for transition $old -> $new', async ({ old, oldFactory, newFactory }) => {
      // Given
      const event = createTestEvent({
        nummer: 'B-005',
        oldStatus: oldFactory(),
        newStatus: newFactory(),
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0][0];
      expect(receivedCommand.text).toContain(`von ${old}`);
    });
  });

  describe('Fire-and-Forget Pattern', () => {
    it('should NOT throw when handler execution fails', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('Repository save failed'));

      // When & Then
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should call Logger.error() when AddEintragHandler returns failure', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.fail('DB Error'));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to add ETB entry.*DB Error/), 'BefehlStatusGeaendertEtbHandler');
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*Fatal error.*stack=/), 'BefehlStatusGeaendertEtbHandler');
    });
  });

  describe('Validation', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given: Event mit null einsatzId
      const event = createTestEvent();
      const invalidEvent = { ...event, einsatzId: null } as unknown as BefehlStatusGeaendertEvent;
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(invalidEvent);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/BefehlStatusGeaendert event has missing required fields/), 'BefehlStatusGeaendertEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for BefehlStatusGeaendert'), 'BefehlStatusGeaendertEtbHandler');
    });

    it('should log success message on successful creation', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for BefehlStatusGeaendert/), 'BefehlStatusGeaendertEtbHandler');
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
});
