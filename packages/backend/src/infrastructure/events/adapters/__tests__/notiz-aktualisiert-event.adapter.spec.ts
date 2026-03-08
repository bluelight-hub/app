// @ts-nocheck
/**
 * Unit Tests fuer NotizAktualisiertEventAdapter.
 *
 * Testet den Infrastructure Adapter, der NotizAktualisiertEvents empfaengt
 * und an den Application Layer Handler delegiert.
 *
 * **Test Coverage:**
 * - onNotizAktualisiert: Delegation an Handler mit korrektem Event
 * - Logging: Korrekte Log-Ausgaben mit Event-Kontext
 * - Error Propagation: Handler-Fehler werden propagiert
 */

import { NotizAktualisiertEventAdapter } from '../notiz-aktualisiert-event.adapter';
import { NotizAktualisiertEvent } from '@domain/notiz/events/notiz-aktualisiert.event';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('NotizAktualisiertEventAdapter', () => {
  let adapter: NotizAktualisiertEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<NotizAktualisiertEvent>>;
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Generiert eine gueltige NotizId fuer Tests.
   */
  const generateValidNotizId = () => NotizId.create().value! as NotizId;

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
    adapter = new NotizAktualisiertEventAdapter(mockHandler, mockLogger);
  });

  describe('onNotizAktualisiert', () => {
    it('should delegate event to handler', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizAktualisiertEvent(notizId, 'einsatz-123', 'Aktualisierter Titel', 'Neuer Inhalt', 'Lage', false, 'user-123', notizId.toString());

      // When (Act)
      await adapter.onNotizAktualisiert(event);

      // Then (Assert)
      expect(mockHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should log event receipt with correct context', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizAktualisiertEvent(notizId, 'einsatz-456', 'Beobachtung aktualisiert', 'Detaillierter Inhalt', 'Wetter', true, 'user-456', notizId.toString());

      // When (Act)
      await adapter.onNotizAktualisiert(event);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('NotizAktualisiertEvent'),
        expect.objectContaining({
          notizId: notizId.toString(),
          einsatzId: 'einsatz-456',
          titel: 'Beobachtung aktualisiert',
        }),
      );
    });

    it('should propagate handler errors', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizAktualisiertEvent(notizId, 'einsatz-789', 'Fehler Notiz', null, null, false, 'user-789', notizId.toString());

      const handlerError = new Error('Handler failed');
      mockHandler.handle.mockRejectedValue(handlerError);

      // When & Then (Act & Assert)
      await expect(adapter.onNotizAktualisiert(event)).rejects.toThrow('Handler failed');
    });

    it('should pass event with null optional fields correctly', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizAktualisiertEvent(
        notizId,
        'einsatz-123',
        'Notiz ohne Details',
        null, // inhalt
        null, // kategorie
        false,
        'user-123',
        notizId.toString(),
      );

      // When (Act)
      await adapter.onNotizAktualisiert(event);

      // Then (Assert)
      const passedEvent = mockHandler.handle.mock.calls[0]?.[0]!;
      expect(passedEvent.inhalt).toBeNull();
      expect(passedEvent.kategorie).toBeNull();
    });

    it('should pass event with istTeamsichtbar=true correctly', async () => {
      // Given (Arrange)
      const notizId = generateValidNotizId();
      const event = new NotizAktualisiertEvent(notizId, 'einsatz-123', 'Teamsichtbare Notiz', 'Inhalt', 'Personal', true, 'user-123', notizId.toString());

      // When (Act)
      await adapter.onNotizAktualisiert(event);

      // Then (Assert)
      const passedEvent = mockHandler.handle.mock.calls[0]?.[0]!;
      expect(passedEvent.istTeamsichtbar).toBe(true);
    });
  });
});
