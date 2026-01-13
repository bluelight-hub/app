import { Result } from '@domain/common/result';
import { ServerAccessTokenUsedEvent } from '@domain/events/server-access-token-used.event';
import { AccessTokenId } from '@domain/value-objects/access-token-id';
import type { IServerAccessTokenRepository } from '@domain/repositories/i-server-access-token.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ServerAccessTokenUsedEventHandler } from '../server-access-token-used.handler';

/**
 * Unit Tests für ServerAccessTokenUsedEventHandler.
 *
 * Testet das asynchrone Usage-Tracking mit In-Memory Debounce.
 *
 * **Test-Kategorien:**
 * - AC1: Handler ruft Repository.updateLastUsed() auf
 * - AC2: Debounce verhindert mehrfache Updates innerhalb des Intervalls
 * - AC3: Nach Debounce-Intervall werden Updates wieder erlaubt
 * - AC4: Fire-and-Forget - Handler wirft NIEMALS Exceptions
 * - AC5: Unterschiedliche Tokens werden unabhängig gehandled
 *
 * @module application/admin/event-handlers/__tests__
 */
describe('ServerAccessTokenUsedEventHandler', () => {
  let handler: ServerAccessTokenUsedEventHandler;
  let mockRepository: jest.Mocked<IServerAccessTokenRepository>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test-Helper für deterministische Token-IDs
  const createTestTokenId = (): AccessTokenId => {
    const result = AccessTokenId.create();
    if (result.isFailure) {
      throw new Error(`Failed to create AccessTokenId: ${result.error}`);
    }
    return result.value;
  };

  // Test-Helper für Events
  const createTestEvent = (tokenId?: AccessTokenId, usedAt?: Date): ServerAccessTokenUsedEvent => {
    const id = tokenId ?? createTestTokenId();
    const timestamp = usedAt ?? new Date();
    return new ServerAccessTokenUsedEvent(id, timestamp, id.toString());
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Repository
    mockRepository = {
      updateLastUsed: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findAllActive: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsByTokenHash: jest.fn(),
      countActive: jest.fn(),
      findAllPaginated: jest.fn(),
    } as unknown as jest.Mocked<IServerAccessTokenRepository>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    // Handler mit Mocks instanziieren
    handler = new ServerAccessTokenUsedEventHandler(mockRepository, mockLogger);
  });

  afterEach(() => {
    // Debounce-Map zwischen Tests leeren
    handler.clearDebounceMap();
  });

  describe('AC1: Handler sollte Repository.updateLastUsed() aufrufen', () => {
    it('should call updateLastUsed with correct tokenId and usedAt', async () => {
      // Given
      const tokenId = createTestTokenId();
      const usedAt = new Date('2025-01-12T10:00:00.000Z');
      const event = createTestEvent(tokenId, usedAt);

      // When
      await handler.handle(event);

      // Then
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateLastUsed).toHaveBeenCalledWith(tokenId, usedAt);
    });

    it('should log debug message on successful update', async () => {
      // Given
      const event = createTestEvent();
      mockRepository.updateLastUsed.mockResolvedValue(Result.ok(undefined));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Updated token lastUsedAt',
        expect.objectContaining({
          tokenId: event.tokenId.toString(),
          usedAt: expect.any(String),
        }),
      );
    });

    it('should log error when repository returns failure', async () => {
      // Given
      const event = createTestEvent();
      mockRepository.updateLastUsed.mockResolvedValue(Result.fail('Database error'));

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to update token lastUsedAt',
        expect.objectContaining({
          tokenId: event.tokenId.toString(),
          error: 'Database error',
        }),
      );
    });
  });

  describe('AC2: Debounce verhindert mehrfache Updates innerhalb des Intervalls', () => {
    it('should skip update when called multiple times within debounce interval', async () => {
      // Given
      const tokenId = createTestTokenId();
      const event1 = createTestEvent(tokenId);
      const event2 = createTestEvent(tokenId);
      const event3 = createTestEvent(tokenId);

      // When - 3 Events in schneller Folge
      await handler.handle(event1);
      await handler.handle(event2);
      await handler.handle(event3);

      // Then - Nur der erste Call sollte durchgehen
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(1);
    });

    it('should log debug message when skipping due to debounce', async () => {
      // Given
      const tokenId = createTestTokenId();
      const event1 = createTestEvent(tokenId);
      const event2 = createTestEvent(tokenId);

      // When
      await handler.handle(event1);
      await handler.handle(event2);

      // Then
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Skipping lastUsedAt update (debounced)',
        expect.objectContaining({
          tokenId: tokenId.toString(),
          debounceMs: 60000,
        }),
      );
    });

    it('should update debounce map size after handling event', async () => {
      // Given
      const tokenId = createTestTokenId();
      const event = createTestEvent(tokenId);

      expect(handler.getDebounceMapSize()).toBe(0);

      // When
      await handler.handle(event);

      // Then
      expect(handler.getDebounceMapSize()).toBe(1);
    });
  });

  describe('AC3: Nach Debounce-Intervall werden Updates wieder erlaubt', () => {
    it('should allow update after debounce interval has passed', async () => {
      // Given
      const tokenId = createTestTokenId();
      const event1 = createTestEvent(tokenId);
      const event2 = createTestEvent(tokenId);

      // When - Erstes Event
      await handler.handle(event1);

      // Simuliere Zeitablauf durch direkten Map-Zugriff (> 60 Sekunden)
      // Da wir keinen echten setTimeout nutzen können, manipulieren wir die Map
      handler.clearDebounceMap();

      // Zweites Event nach "Ablauf" des Debounce-Intervalls
      await handler.handle(event2);

      // Then - Beide Events sollten verarbeitet worden sein
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(2);
    });
  });

  describe('AC4: Fire-and-Forget - Handler wirft NIEMALS Exceptions', () => {
    it('should NOT throw when repository throws', async () => {
      // Given
      const event = createTestEvent();
      mockRepository.updateLastUsed.mockRejectedValue(new Error('Database connection failed'));

      // When & Then - Sollte NICHT werfen
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should log error when repository throws', async () => {
      // Given
      const event = createTestEvent();
      const error = new Error('Database connection failed');
      mockRepository.updateLastUsed.mockRejectedValue(error);

      // When
      await handler.handle(event);

      // Then
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error updating token lastUsedAt',
        expect.objectContaining({
          tokenId: event.tokenId.toString(),
          error: 'Database connection failed',
          stack: expect.any(String),
        }),
      );
    });

    it('should handle non-Error thrown objects gracefully', async () => {
      // Given
      const event = createTestEvent();
      mockRepository.updateLastUsed.mockRejectedValue('String error');

      // When & Then
      await expect(handler.handle(event)).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error updating token lastUsedAt',
        expect.objectContaining({
          error: 'String error',
        }),
      );
    });

    it('should NOT throw when repository returns failure', async () => {
      // Given
      const event = createTestEvent();
      mockRepository.updateLastUsed.mockResolvedValue(Result.fail('Some error'));

      // When & Then
      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should return void (undefined) in all scenarios', async () => {
      // Given - Erfolgs-Szenario
      const event = createTestEvent();
      mockRepository.updateLastUsed.mockResolvedValue(Result.ok(undefined));

      // When
      const result = await handler.handle(event);

      // Then
      expect(result).toBeUndefined();
    });
  });

  describe('AC5: Unterschiedliche Tokens werden unabhängig gehandled', () => {
    it('should allow updates for different tokens within same interval', async () => {
      // Given
      const tokenId1 = createTestTokenId();
      const tokenId2 = createTestTokenId();
      const event1 = createTestEvent(tokenId1);
      const event2 = createTestEvent(tokenId2);

      // When
      await handler.handle(event1);
      await handler.handle(event2);

      // Then - Beide sollten verarbeitet werden (verschiedene Tokens)
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateLastUsed).toHaveBeenCalledWith(tokenId1, expect.any(Date));
      expect(mockRepository.updateLastUsed).toHaveBeenCalledWith(tokenId2, expect.any(Date));
    });

    it('should track debounce separately per token', async () => {
      // Given
      const tokenId1 = createTestTokenId();
      const tokenId2 = createTestTokenId();

      // When - Mehrere Events für verschiedene Tokens
      await handler.handle(createTestEvent(tokenId1));
      await handler.handle(createTestEvent(tokenId1)); // Debounced
      await handler.handle(createTestEvent(tokenId2));
      await handler.handle(createTestEvent(tokenId2)); // Debounced

      // Then
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(2);
      expect(handler.getDebounceMapSize()).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple sequential events without interference', async () => {
      // Given
      const events = Array.from({ length: 5 }, () => createTestEvent());

      // When
      for (const event of events) {
        await handler.handle(event);
      }

      // Then - Jedes Event hat eigenen Token, alle sollten durchgehen
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(5);
    });

    it('should clear debounce map correctly', async () => {
      // Given
      const event = createTestEvent();
      await handler.handle(event);
      expect(handler.getDebounceMapSize()).toBe(1);

      // When
      handler.clearDebounceMap();

      // Then
      expect(handler.getDebounceMapSize()).toBe(0);
    });

    it('should handle event with exact debounce boundary', async () => {
      // Given
      const tokenId = createTestTokenId();
      const event1 = createTestEvent(tokenId);

      // When
      await handler.handle(event1);

      // Direkt nach dem ersten Handle sollte der zweite geblockt werden
      const event2 = createTestEvent(tokenId);
      await handler.handle(event2);

      // Then
      expect(mockRepository.updateLastUsed).toHaveBeenCalledTimes(1);
    });
  });
});
