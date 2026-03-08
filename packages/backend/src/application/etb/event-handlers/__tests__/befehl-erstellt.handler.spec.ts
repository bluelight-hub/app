// @ts-nocheck
import { Result } from '@domain/common/result';
import { BefehlErstelltEvent } from '@domain/events/befehl-erstellt.event';
import { BefehlId } from '@domain/value-objects/befehl-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { AddEintragHandler } from '@application/etb/commands';
import { BefehlErstelltEtbHandler } from '../befehl-erstellt.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
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

/**
 * Erstellt ein Test-BefehlErstelltEvent mit allen erforderlichen Daten.
 */
function createTestEvent(
  overrides: Partial<{
    befehlId: BefehlId;
    einsatzId: EinsatzId;
    auftrag: string;
    nummer: string;
    empfaenger: string[];
  }> = {},
): BefehlErstelltEvent {
  return new BefehlErstelltEvent(
    overrides.befehlId ?? createTestBefehlId(),
    overrides.einsatzId ?? createTestEinsatzId(),
    overrides.auftrag ?? 'Einsatzabschnitt Nord absichern',
    overrides.nummer ?? 'B-001',
    overrides.empfaenger ?? ['ZF Nord', 'ZF Süd'],
  );
}

describe('BefehlErstelltEtbHandler (Story 4.3)', () => {
  let handler: BefehlErstelltEtbHandler;
  let mockAddEintragHandler: jest.Mocked<AddEintragHandler>;
  let mockLogger: jest.Mocked<{
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  }>;

  beforeEach(() => {
    // Mock AddEintragHandler
    mockAddEintragHandler = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AddEintragHandler>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<typeof mockLogger>;

    jest.clearAllMocks();

    handler = new BefehlErstelltEtbHandler(mockAddEintragHandler, mockLogger);
  });

  describe('ETB-Eintrag fuer Befehl-Erstellung', () => {
    it('should create ETB entry with correct text format: Befehl #${nummer}: ${auftrag} an ${empfaenger.length} Empfänger', async () => {
      // Given
      const event = createTestEvent({
        nummer: 'B-007',
        auftrag: 'Einsatzabschnitt Nord absichern',
        empfaenger: ['ZF Nord', 'ZF Süd', 'ZF Ost'],
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toBe('Befehl #B-007: Einsatzabschnitt Nord absichern an 3 Empfänger');
    });

    it('should set kategorie to BEFEHL', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.kategorie).toBe('BEFEHL');
    });

    it('should set etbId equal to einsatzId (1:1 relationship)', async () => {
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

    it('should pass userId as system', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.userId).toBe('system');
    });

    it('should include metadata with eventType and befehlId', async () => {
      // Given
      const befehlId = createTestBefehlId();
      const event = createTestEvent({ befehlId });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toEqual({
        eventType: 'BefehlErstellt',
        befehlId: befehlId.value,
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

    it('should pass occurredAt from event to AddEintragCommand', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.occurredAt).toEqual(event.occurredAt);
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to add ETB entry.*DB Error/), 'BefehlErstelltEtbHandler');
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*Fatal error.*stack=/), 'BefehlErstelltEtbHandler');
    });
  });

  describe('Validation', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given: Event ohne nummer (leerer String)
      const event = createTestEvent({ nummer: '' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then - Error loggen und Early Exit (keine Verarbeitung)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/BefehlErstellt event has missing required fields/), 'BefehlErstelltEtbHandler');
      // Handler sollte NICHT fortfahren (Early Exit)
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for BefehlErstellt'), 'BefehlErstelltEtbHandler');
    });

    it('should log success message on successful creation', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for BefehlErstellt/), 'BefehlErstelltEtbHandler');
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
