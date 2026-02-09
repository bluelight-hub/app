/**
 * Unit Tests fuer NotizGeloeschtEventAdapter.
 *
 * Testet den Infrastructure Adapter, der NotizGeloeschtEvents empfaengt
 * und an den Application Layer Handler delegiert.
 *
 * **Test Coverage:**
 * - onNotizGeloescht: Delegation an Handler mit korrektem Event
 * - Logging: Korrekte Log-Ausgaben mit Event-Kontext
 * - Error Propagation: Handler-Fehler werden propagiert
 */

import { NotizGeloeschtEventAdapter } from '../notiz-geloescht-event.adapter';
import { NotizGeloeschtEvent } from '@domain/notiz/events/notiz-geloescht.event';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { UserId } from '@domain/value-objects/user-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('NotizGeloeschtEventAdapter', () => {
  let adapter: NotizGeloeschtEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<NotizGeloeschtEvent>>;
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
    adapter = new NotizGeloeschtEventAdapter(mockHandler, mockLogger);
  });

  describe('onNotizGeloescht', () => {
    it('should delegate event to handler', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const geloeschtVon = generateValidUserId();
      const event = new NotizGeloeschtEvent(notizId, 'einsatz-123', 'Geloeschte Notiz', geloeschtVon, notizId.toString());

      // When (Act)
      await adapter.onNotizGeloescht(event);

      // Then (Assert)
      expect(mockHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should log event receipt with correct context', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const geloeschtVon = generateValidUserId();
      const event = new NotizGeloeschtEvent(notizId, 'einsatz-456', 'Wichtige Beobachtung geloescht', geloeschtVon, notizId.toString());

      // When (Act)
      await adapter.onNotizGeloescht(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('NotizGeloeschtEvent'),
        expect.objectContaining({
          notizId: notizId.toString(),
          einsatzId: 'einsatz-456',
          titel: 'Wichtige Beobachtung geloescht',
        }),
      );
    });

    it('should propagate handler errors', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizGeloeschtEvent(notizId, 'einsatz-789', 'Fehler Notiz', generateValidUserId(), notizId.toString());

      const handlerError = new Error('Handler failed');
      mockHandler.handle.mockRejectedValue(handlerError);

      // When & Then (Act & Assert)
      await expect(adapter.onNotizGeloescht(event)).rejects.toThrow('Handler failed');
    });

    it('should pass event with correct geloeschtVon user id', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const geloeschtVon = generateValidUserId();
      const event = new NotizGeloeschtEvent(notizId, 'einsatz-123', 'Notiz zum Loeschen', geloeschtVon, notizId.toString());

      // When (Act)
      await adapter.onNotizGeloescht(event);

      // Then (Assert)
      const passedEvent = mockHandler.handle.mock.calls[0][0];
      expect(passedEvent.geloeschtVon.equals(geloeschtVon)).toBe(true);
      expect(passedEvent.notizId.toString()).toBe(notizId.toString());
      expect(passedEvent.einsatzId).toBe('einsatz-123');
    });
  });
});
