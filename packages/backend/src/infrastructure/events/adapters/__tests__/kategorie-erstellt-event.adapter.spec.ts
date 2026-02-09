/**
 * Unit Tests fuer KategorieErstelltEventAdapter.
 *
 * Testet den Infrastructure Event Adapter, der Domain Events empfaengt
 * und an den Application Layer Handler delegiert.
 *
 * **Test Coverage:**
 * - Delegation: onKategorieErstellt ruft handler.handle() auf
 * - Logging: Event-Details werden korrekt geloggt
 * - Event Payload: Korrekte Daten werden an Handler weitergeleitet
 */
import { KategorieErstelltEventAdapter } from '../kategorie-erstellt-event.adapter';
import { KategorieErstelltEvent } from '@domain/kategorie/events/kategorie-erstellt.event';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { UserId } from '@domain/value-objects/user-id';
import type { IEventHandler } from '@domain/ports/i-event-handler.port';
import type { ILogger } from '@domain/ports/i-logger.port';

describe('KategorieErstelltEventAdapter', () => {
  let adapter: KategorieErstelltEventAdapter;
  let mockHandler: jest.Mocked<IEventHandler<KategorieErstelltEvent>>;
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
    } as jest.Mocked<IEventHandler<KategorieErstelltEvent>>;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Erstelle Adapter manuell mit Mocks (kein NestJS DI noetig fuer Unit Tests)
    adapter = new KategorieErstelltEventAdapter(mockHandler, mockLogger);
  });

  describe('onKategorieErstellt', () => {
    it('should delegate event to Application Layer handler', async () => {
      // Given: Gueltiges KategorieErstelltEvent
      const kategorieId = generateValidKategorieId();
      const erstelltVon = generateValidUserId();
      const event = new KategorieErstelltEvent(kategorieId, 'einsatz-123', 'Lage', '#FF5733', erstelltVon, kategorieId.toString());

      // When: Adapter empfaengt Event
      await adapter.onKategorieErstellt(event);

      // Then: Handler.handle() mit korrektem Event aufgerufen
      expect(mockHandler.handle).toHaveBeenCalledTimes(1);
      expect(mockHandler.handle).toHaveBeenCalledWith(event);
    });

    it('should log event details with correct context', async () => {
      // Given: Event mit bekannten Werten
      const kategorieId = generateValidKategorieId();
      const erstelltVon = generateValidUserId();
      const event = new KategorieErstelltEvent(kategorieId, 'einsatz-456', 'Personal', '#00FF00', erstelltVon, kategorieId.toString());

      // When: Adapter empfaengt Event
      await adapter.onKategorieErstellt(event);

      // Then: Logger mit Event-Details aufgerufen
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Received KategorieErstelltEvent'),
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
      const erstelltVon = generateValidUserId();
      const event = new KategorieErstelltEvent(kategorieId, 'einsatz-789', 'Technik', '#0000FF', erstelltVon);

      // When: Adapter empfaengt Event
      await adapter.onKategorieErstellt(event);

      // Then: Exaktes Event-Objekt weitergegeben
      const passedEvent = mockHandler.handle.mock.calls[0][0];
      expect(passedEvent).toBe(event);
      expect(passedEvent.kategorieId).toBe(kategorieId);
      expect(passedEvent.einsatzId).toBe('einsatz-789');
      expect(passedEvent.name).toBe('Technik');
      expect(passedEvent.farbe).toBe('#0000FF');
      expect(passedEvent.erstelltVon).toBe(erstelltVon);
    });
  });
});
