import { ErinnerungErstelltEvent } from '@domain/events/erinnerung-erstellt.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { UserId } from '@domain/value-objects/user-id';
import { ErinnerungErstelltEventHandler } from '../erinnerung-erstellt.handler';

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

describe('ErinnerungErstelltEventHandler (Stub - Story 5.0)', () => {
  let handler: ErinnerungErstelltEventHandler;
  let mockLogger: jest.Mocked<{
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    debug: jest.Mock;
  }>;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<typeof mockLogger>;

    jest.clearAllMocks();

    handler = new ErinnerungErstelltEventHandler(mockLogger);
  });

  describe('Story 5.0: Stub-Implementierung', () => {
    it('sollte Event erfolgreich loggen', async () => {
      // Given
      const event = new ErinnerungErstelltEvent(
        createTestErinnerungId(),
        createTestEinsatzId(),
        'Test-Erinnerung',
        new Date('2026-01-20T14:30:00.000Z'),
        createTestUserId(),
        null, // assignedToId
        null, // eskalationsPersonId
      );

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('[STUB] ErinnerungErstelltEvent received'), 'ErinnerungErstelltEventHandler');
    });

    it('sollte Event-Daten im Log enthalten', async () => {
      // Given
      const erinnerungId = createTestErinnerungId();
      const einsatzId = createTestEinsatzId();
      const titel = 'Lagebesprechung';

      const event = new ErinnerungErstelltEvent(erinnerungId, einsatzId, titel, new Date(), createTestUserId(), null, null);

      // When
      await handler.handle(event);

      // Then
      const logMessage = mockLogger.log.mock.calls[0][0];
      expect(logMessage).toContain(einsatzId.toString());
      expect(logMessage).toContain(erinnerungId.toString());
      expect(logMessage).toContain(titel);
    });

    it('sollte NIEMALS Exceptions werfen (Fire-and-Forget)', async () => {
      // Given
      const event = new ErinnerungErstelltEvent(createTestErinnerungId(), createTestEinsatzId(), 'Test', new Date(), createTestUserId(), null, null);

      // When & Then - keine Exception
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('sollte void (undefined) zurueckgeben', async () => {
      // Given
      const event = new ErinnerungErstelltEvent(createTestErinnerungId(), createTestEinsatzId(), 'Test', new Date(), createTestUserId(), null, null);

      // When
      const result = await handler.handle(event);

      // Then
      expect(result).toBeUndefined();
    });
  });
});
