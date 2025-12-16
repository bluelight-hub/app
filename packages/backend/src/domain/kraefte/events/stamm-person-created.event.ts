import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine neue Stamm-Person erstellt wird.
 *
 * Rich Data Pattern: Enthält alle relevanten Daten für Event Handler
 * um DB-Queries zu vermeiden.
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
 */
export class StammPersonCreatedEvent extends DomainEvent {
  constructor(
    public readonly stammPersonId: string,
    public readonly vorname: string,
    public readonly nachname: string,
    public readonly personalnummer: string,
    public readonly createdBy: string,
  ) {
    super(stammPersonId); // aggregateId = stammPersonId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'StammPersonCreated';
  }
}
