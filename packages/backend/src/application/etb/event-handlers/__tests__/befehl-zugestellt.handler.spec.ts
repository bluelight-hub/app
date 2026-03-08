// @ts-nocheck
import { Result } from '@domain/common/result';
import { BefehlZugestelltEvent } from '@domain/events/befehl-zugestellt.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { BefehlZugestelltEtbHandler } from '../befehl-zugestellt.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
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
    empfaengerId: string;
    empfaengerName: string;
    nummer: string;
    zugestelltAm: Date;
  }> = {},
): BefehlZugestelltEvent {
  return new BefehlZugestelltEvent(
    overrides.befehlId ?? createTestBefehlId(),
    overrides.empfaengerId ?? 'user-empfaenger-1',
    overrides.zugestelltAm ?? new Date('2026-02-25T10:00:00.000Z'),
    overrides.einsatzId ?? createTestEinsatzId(),
    overrides.empfaengerName ?? 'ZF Nord',
    overrides.nummer ?? 'B-001',
  );
}

describe('BefehlZugestelltEtbHandler', () => {
  let handler: BefehlZugestelltEtbHandler;
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

    handler = new BefehlZugestelltEtbHandler(mockAddEintragHandler, mockLogger);
  });

  describe('ETB-Eintrag Erstellung', () => {
    it('should create ETB entry with correct text format: "Befehl #nummer: Zugestellt an empfaengerName"', async () => {
      // Given
      const event = createTestEvent({
        nummer: 'B-007',
        empfaengerName: 'ZF Süd',
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe('Befehl #B-007: Zugestellt an ZF Süd');
    });

    it('should set kategorie to SYSTEM', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.kategorie).toBe('SYSTEM');
    });

    it('should set etbId equal to einsatzId.value (1:1 relationship)', async () => {
      // Given
      const einsatzId = createTestEinsatzId();
      const event = createTestEvent({ einsatzId });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.etbId).toBe(einsatzId.value);
    });

    it('should set userId to "system"', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.userId).toBe('system');
    });

    it('should include metadata with eventType, befehlId, empfaengerId and empfaengerName', async () => {
      // Given
      const befehlId = createTestBefehlId();
      const event = createTestEvent({
        befehlId,
        empfaengerId: 'user-xyz',
        empfaengerName: 'ZF Ost',
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toEqual({
        eventType: 'BefehlZugestellt',
        befehlId: befehlId.value,
        empfaengerId: 'user-xyz',
        empfaengerName: 'ZF Ost',
      });
    });

    it('should pass einsatzId from event to ETB command', async () => {
      // Given
      const einsatzId = createTestEinsatzId();
      const event = createTestEvent({ einsatzId });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.einsatzId).toBe(einsatzId.value);
    });

    it('should pass zugestelltAm as occurredAt to AddEintragCommand', async () => {
      // Given
      const zugestelltAm = new Date('2026-02-25T15:45:00.000Z');
      const event = createTestEvent({ zugestelltAm });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.occurredAt).toEqual(zugestelltAm);
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to add ETB entry.*DB Error/), 'BefehlZugestelltEtbHandler');
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*Fatal error.*stack=/), 'BefehlZugestelltEtbHandler');
    });
  });

  describe('Validation', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given: Event mit null einsatzId
      const event = createTestEvent();
      const invalidEvent = { ...event, einsatzId: null } as unknown as BefehlZugestelltEvent;
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(invalidEvent);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/BefehlZugestellt event has missing required fields/), 'BefehlZugestelltEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should call Logger.error() and early exit when empfaengerName is missing', async () => {
      // Given: Event mit leerem empfaengerName
      const event = createTestEvent({ empfaengerName: '' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/BefehlZugestellt event has missing required fields/), 'BefehlZugestelltEtbHandler');
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log at start of processing', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for BefehlZugestellt'), 'BefehlZugestelltEtbHandler');
    });

    it('should log success message on successful creation', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for BefehlZugestellt/), 'BefehlZugestelltEtbHandler');
    });

    it('should log start and success messages (2x log calls) on success', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });
  });
});
