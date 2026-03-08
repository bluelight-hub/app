// @ts-nocheck
/**
 * Unit Tests fuer KategorieGeloeschtEventAdapter.
 *
 * Testet den Infrastructure Event Adapter, der Domain Events empfaengt
 * und an den Application Layer Handler delegiert.
 *
 * **Test Coverage:**
 * - Delegation: onKategorieGeloescht ruft handler.handle() auf
 * - Logging: Event-Details werden korrekt geloggt
 * - Event Payload: Korrekte Daten werden an Handler weitergeleitet
 */
import { KategorieGeloeschtEventAdapter } from '../kategorie-geloescht-event.adapter';
import { KategorieGeloeschtEvent } from '@domain/kategorie/events/kategorie-geloescht.event';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { UserId } from '@domain/value-objects/user-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('KategorieGeloeschtEventAdapter', () => {
  let adapter: KategorieGeloeschtEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<KategorieGeloeschtEvent>>;
  let mockLogger: jest.Mocked<ILogger>;

  /**
   * Generiert eine gueltige KategorieId fuer Tests.
   */
  const generateValidKategorieId = () => KategorieId.create().value! as KategorieId;

  /**
   * Generiert eine gueltige UserId fuer Tests.
   */
  const generateValidUserId = () => UserId.create().value!;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Handler
    mockHandler = {
      handle: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventHandler<KategorieGeloeschtEvent>>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Erstelle Adapter manuell mit Mocks (kein NestJS DI noetig fuer Unit Tests)
    adapter = new KategorieGeloeschtEventAdapter(mockHandler, mockLogger);
  });

  describe('onKategorieGeloescht', () => {
    it('should delegate event to Application Layer handler', async () => {
      // Given: Gueltiges KategorieGeloeschtEvent
      const kategorieId = generateValidKategorieId();
      const geloeschtVon = generateValidUserId();
      const event = new KategorieGeloeschtEvent(kategorieId, 'einsatz-123', 'Lage', geloeschtVon, kategorieId.toString());

      // When: Adapter empfaengt Event
      await adapter.onKategorieGeloescht(event);

      // Then: Handler.handle() mit korrektem Event aufgerufen
      expect(mockHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should log event details with correct context', async () => {
      // Given: Event mit bekannten Werten
      const kategorieId = generateValidKategorieId();
      const geloeschtVon = generateValidUserId();
      const event = new KategorieGeloeschtEvent(kategorieId, 'einsatz-456', 'Personal', geloeschtVon, kategorieId.toString());

      // When: Adapter empfaengt Event
      await adapter.onKategorieGeloescht(event);

      // Then: Logger mit Event-Details aufgerufen
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Received KategorieGeloeschtEvent'),
        expect.objectContaining({
          kategorieId: kategorieId.toString(),
          einsatzId: 'einsatz-456',
          name: 'Personal',
        }),
      );
    });

    it('should pass the exact event object to handler without modification', async () => {
      // Given: Event mit spezifischen Daten
      const kategorieId = generateValidKategorieId();
      const geloeschtVon = generateValidUserId();
      const event = new KategorieGeloeschtEvent(kategorieId, 'einsatz-789', 'Technik', geloeschtVon);

      // When: Adapter empfaengt Event
      await adapter.onKategorieGeloescht(event);

      // Then: Exaktes Event-Objekt weitergegeben
      const passedEvent = mockHandler.handle.mock.calls[0]?.[0]!;
      expect(passedEvent).toBe(event);
      expect(passedEvent.kategorieId).toBe(kategorieId);
      expect(passedEvent.einsatzId).toBe('einsatz-789');
      expect(passedEvent.name).toBe('Technik');
      expect(passedEvent.geloeschtVon).toBe(geloeschtVon);
    });
  });
});
