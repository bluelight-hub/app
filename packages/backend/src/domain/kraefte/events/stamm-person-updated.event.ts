import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Stamm-Person aktualisiert wird.
 *
 * Enthält die geänderten Felder für optimierte Event Handler.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE String statt Value Objects (StammPersonId)
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Value Objects sind mutable References (können sich ändern)
 * - Primitive Strings garantieren echte Immutability und einfache Serialisierung
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Parameter Konsistenz:**
 * - `stammPersonId: string` ist die kanonische ID (CUID2)
 * - `aggregateId` wird an DomainEvent Base Class übergeben (selber Wert)
 * - Redundanz ist akzeptabel für Event Bus Routing (aggregateId) vs. Domain Logic (stammPersonId)
 *
 * **Changes Object:**
 * - Enthält NUR die geänderten Felder (partial update pattern)
 * - Event Handler können gezielt auf spezifische Änderungen reagieren
 * - qualifikationIds ist ein vollständiger Ersatz (kein Delta)
 */
export class StammPersonUpdatedEvent extends DomainEvent {
  constructor(
    public readonly stammPersonId: string,
    public readonly changes: {
      vorname?: string;
      nachname?: string;
      funkkenungBOS?: string;
      qualifikationIds?: string[]; // Vollständiger Ersatz, nicht Delta
      archived?: boolean; // Gesetzt wenn Person archiviert wurde (für Event-Handler-Unterscheidung)
    },
    public readonly updatedBy: string,
  ) {
    super(stammPersonId); // aggregateId = stammPersonId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'StammPersonUpdated';
  }
}
