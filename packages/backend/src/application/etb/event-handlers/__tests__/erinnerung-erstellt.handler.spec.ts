// @ts-nocheck
import { Result } from '@domain/common/result';
import { ErinnerungErstelltEvent } from '@domain/events/erinnerung-erstellt.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { UserId } from '@domain/value-objects/user-id';
import type { AddEintragHandler } from '../../commands/add-eintrag/add-eintrag.handler';
import { ErinnerungErstelltEventHandler } from '../erinnerung-erstellt.handler';

// Mock CUID2 fuer deterministische Tests
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'c' + 'test123456789012345678'),
  isCuid: jest.fn((id: string) => {
    if (id.length < 20 || id.length > 30) return false;
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id);
  }),
}));

/**
 * Deterministische Test-ID Generatoren (R2-TEST3)
 */
function createTestErinnerungId(): ErinnerungId {
  return ErinnerungId.create().value!;
}

function createTestEinsatzId(): EinsatzId {
  return EinsatzId.create().value!;
}

function createTestUserId(): UserId {
  return UserId.create().value!;
}

/**
 * Erstellt ein Test-ErinnerungErstelltEvent mit allen erforderlichen Daten.
 */
function createTestEvent(
  overrides: Partial<{
    erinnerungId: ErinnerungId;
    einsatzId: EinsatzId;
    titel: string;
    faelligAm: Date;
    erstelltVon: UserId;
    assignedToId: UserId | null;
    eskalationsPersonId: UserId | null;
  }> = {},
): ErinnerungErstelltEvent {
  return new ErinnerungErstelltEvent(
    overrides.erinnerungId ?? createTestErinnerungId(),
    overrides.einsatzId ?? createTestEinsatzId(),
    overrides.titel ?? 'Test-Erinnerung',
    overrides.faelligAm ?? new Date('2026-01-20T14:30:00.000Z'),
    overrides.erstelltVon ?? createTestUserId(),
    overrides.assignedToId ?? null,
    overrides.eskalationsPersonId ?? null,
  );
}

describe('ErinnerungErstelltEventHandler (Story 5.1 AC1)', () => {
  let handler: ErinnerungErstelltEventHandler;
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

    handler = new ErinnerungErstelltEventHandler(mockAddEintragHandler, mockLogger);
  });

  describe('AC1: Handler sollte ETB-Eintrag für Erinnerung-Erstellung erstellen', () => {
    it('should create ETB entry with correct text format from ERSTELLT template', async () => {
      // Given
      const faelligAm = new Date('2026-01-20T14:30:00.000Z');
      const event = createTestEvent({
        titel: 'Lagebesprechung',
        faelligAm,
      });

      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(1);
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      // Template: "Erinnerung '{titel}' erstellt, fällig um {faelligAm}"
      expect(receivedCommand.text).toContain("Erinnerung 'Lagebesprechung' erstellt, fällig um");
      expect(receivedCommand.text).toContain('20.01.2026');
    });

    it('should set kategorie to SYSTEM (Story 5.1 AC2)', async () => {
      // Given
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.kategorie).toBe('SYSTEM');
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
      expect(receivedCommand.einsatzId).toBe(einsatzId.toString());
    });

    it('should pass erstelltVon as userId to ETB command', async () => {
      // Given
      const erstelltVon = createTestUserId();
      const event = createTestEvent({ erstelltVon });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.userId).toBe(erstelltVon.toString());
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
      expect(receivedCommand.etbId).toBe(einsatzId.toString());
    });

    it('should include metadata with eventType and erinnerungId', async () => {
      // Given
      const erinnerungId = createTestErinnerungId();
      const faelligAm = new Date('2026-01-20T15:00:00.000Z');
      const event = createTestEvent({
        erinnerungId,
        faelligAm,
      });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.metadata).toEqual({
        eventType: 'ErinnerungErstellt',
        erinnerungId: erinnerungId.toString(),
        faelligAm: faelligAm.toISOString(),
      });

      // AC3: Metadata MUSS erinnerungId und eventType enthalten
      expect(mockAddEintragHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            erinnerungId: event.erinnerungId.toString(),
            eventType: 'ErinnerungErstellt',
          }),
        }),
      );
    });
  });

  describe('AC3: Fire-and-Forget Pattern', () => {
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/Failed to add ETB entry for ErinnerungErstellt.*DB Error/), 'ErinnerungErstelltEventHandler');
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
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/CRITICAL.*Fatal error.*stack=/), 'ErinnerungErstelltEventHandler');
    });

    it('should return void (undefined) in all scenarios', async () => {
      // Given - Success scenario
      const event = createTestEvent();
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      const result = await handler.handle(event);

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should call Logger.error() and early exit when required fields are missing', async () => {
      // Given
      const event = createTestEvent({ titel: '' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then - Error loggen und Early Exit (keine Verarbeitung)
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringMatching(/ErinnerungErstellt event has missing required fields/), 'ErinnerungErstelltEventHandler');
      // Handler sollte NICHT fortfahren (Early Exit)
      expect(mockAddEintragHandler.execute).not.toHaveBeenCalled();
    });

    it('should NOT call Logger.error() for validation when titel is present', async () => {
      // Given
      const event = createTestEvent({ titel: 'Lagebesprechung' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then - Kein Validation-Error wenn Titel vorhanden
      expect(mockLogger.error).not.toHaveBeenCalled();
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
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Creating ETB entry for ErinnerungErstellt'), 'ErinnerungErstelltEventHandler');
    });

    it('should log success message on successful creation', async () => {
      // Given
      const event = createTestEvent({ titel: 'Test' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringMatching(/ETB entry created for ErinnerungErstellt/), 'ErinnerungErstelltEventHandler');
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

  describe('Edge Cases', () => {
    it('should handle multiple sequential events', async () => {
      // Given
      const event1 = createTestEvent({ titel: 'Erinnerung 1' });
      const event2 = createTestEvent({ titel: 'Erinnerung 2' });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event1);
      await handler.handle(event2);

      // Then
      expect(mockAddEintragHandler.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle titel with special characters and umlauts', async () => {
      // Given
      const event = createTestEvent({ titel: "Führungsübergabe - 'dringend'" });
      mockAddEintragHandler.execute.mockResolvedValue(Result.ok({} as import('@domain/entities/etb-eintrag.entity').EtbEintrag));

      // When
      await handler.handle(event);

      // Then
      const receivedCommand = mockAddEintragHandler.execute.mock.calls[0]?.[0]!;
      expect(receivedCommand.text).toContain("Führungsübergabe - 'dringend'");
    });
  });
});
