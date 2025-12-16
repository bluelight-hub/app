import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn ein Stamm-Fahrzeug aktualisiert wird.
 *
 * Enthält die geänderten Felder für optimierte Event Handler.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE String statt Value Objects (StammFahrzeugId)
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Value Objects sind mutable References (können sich ändern)
 * - Primitive Strings garantieren echte Immutability und einfache Serialisierung
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Parameter Konsistenz:**
 * - `stammFahrzeugId: string` ist die kanonische ID (CUID2)
 * - `aggregateId` wird an DomainEvent Base Class übergeben (selber Wert)
 * - Redundanz ist akzeptabel für Event Bus Routing (aggregateId) vs. Domain Logic (stammFahrzeugId)
 *
 * **Changes Object:**
 * - Enthält NUR die geänderten Felder (partial update pattern)
 * - Event Handler können gezielt auf spezifische Änderungen reagieren
 * - fahrzeugtypId ist NICHT enthalten (IMMUTABLE nach Erstellung)
 */
export class StammFahrzeugUpdatedEvent extends DomainEvent {
  constructor(
    public readonly stammFahrzeugId: string,
    public readonly changes: {
      rufname?: string;
      funkrufname?: string;
      kennzeichen?: string;
      baujahr?: number;
      funkkenungBOS?: string;
    },
    public readonly updatedBy: string,
  ) {
    super(stammFahrzeugId); // aggregateId = stammFahrzeugId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'StammFahrzeugUpdated';
  }
}
