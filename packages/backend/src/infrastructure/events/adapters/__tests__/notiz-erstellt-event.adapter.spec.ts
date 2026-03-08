// @ts-nocheck
/**
 * Unit Tests fuer NotizErstelltEventAdapter.
 *
 * Testet den Infrastructure Adapter, der NotizErstelltEvents empfaengt
 * und an den Application Layer Handler delegiert.
 *
 * **Test Coverage:**
 * - onNotizErstellt: Delegation an Handler mit korrektem Event
 * - Logging: Korrekte Log-Ausgaben mit Event-Kontext
 * - Error Propagation: Handler-Fehler werden propagiert
 */

import { NotizErstelltEventAdapter } from '../notiz-erstellt-event.adapter';
import { NotizErstelltEvent } from '@domain/notiz/events/notiz-erstellt.event';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('NotizErstelltEventAdapter', () => {
  let adapter: NotizErstelltEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<NotizErstelltEvent>>;
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Generiert eine gueltige NotizId fuer Tests.
   */
  const generateValidNotizId = () => NotizId.create().value! as NotizId;

  /**
   * Generiert eine gueltige UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Handler
    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Erstelle Adapter manuell mit Mocks (kein NestJS DI noetig fuer Unit Tests)
    adapter = new NotizErstelltEventAdapter(mockHandler, mockLogger);
  });

  describe('onNotizErstellt', () => {
    it('should delegate event to handler', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const erstelltVon = generateValidUserId();
      const event = new NotizErstelltEvent(notizId, 'einsatz-123', 'Lagenotiz', erstelltVon, false, notizId.toString());

      // When (Act)
      await adapter.onNotizErstellt(event);

      // Then (Assert)
      expect(mockHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should log event receipt with correct context', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const erstelltVon = generateValidUserId();
      const event = new NotizErstelltEvent(notizId, 'einsatz-456', 'Wichtige Beobachtung', erstelltVon, true, notizId.toString());

      // When (Act)
      await adapter.onNotizErstellt(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('NotizErstelltEvent'),
        expect.objectContaining({
          notizId: notizId.toString(),
          einsatzId: 'einsatz-456',
          titel: 'Wichtige Beobachtung',
        }),
      );
    });

    it('should propagate handler errors', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizErstelltEvent(notizId, 'einsatz-789', 'Fehler Notiz', generateValidUserId(), false, notizId.toString());

      const handlerError = new Error('Handler failed');
      mockHandler.handle.mockRejectedValue(handlerError);

      // When & Then (Act & Assert)
      await expect(adapter.onNotizErstellt(event)).rejects.toThrow('Handler failed');
    });

    it('should pass event with istTeamsichtbar=true correctly', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizErstelltEvent(notizId, 'einsatz-123', 'Teamsichtbare Notiz', generateValidUserId(), true, notizId.toString());

      // When (Act)
      await adapter.onNotizErstellt(event);

      // Then (Assert)
      const passedEvent = mockHandler.handle.mock.calls[0]?.[0]!;
      expect(passedEvent.istTeamsichtbar).toBe(true);
      expect(passedEvent.titel).toBe('Teamsichtbare Notiz');
    });
  });
});
