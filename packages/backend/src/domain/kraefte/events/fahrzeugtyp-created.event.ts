import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn ein neuer Fahrzeugtyp erstellt wird.
 *
 * Rich Data Pattern: Enthält alle relevanten Daten für Event Handler
 * um DB-Queries zu vermeiden.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE String statt Value Objects (FahrzeugtypId)
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Value Objects sind mutable References (können sich ändern)
 * - Primitive Strings garantieren echte Immutability und einfache Serialisierung
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Parameter Konsistenz:**
 * - `fahrzeugtypId: string` ist die kanonische ID (CUID2)
 * - `aggregateId` wird an DomainEvent Base Class übergeben (selber Wert)
 * - Redundanz ist akzeptabel für Event Bus Routing (aggregateId) vs. Domain Logic (fahrzeugtypId)
 */
export class FahrzeugtypCreatedEvent extends DomainEvent {
  constructor(
    public readonly fahrzeugtypId: string,
    public readonly code: string,
    public readonly bezeichnung: string,
    public readonly kategorie: string,
    public readonly createdBy: string,
  ) {
    super(fahrzeugtypId); // aggregateId = fahrzeugtypId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'FahrzeugtypCreated';
  }
}
