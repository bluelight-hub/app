import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn ein neues Stamm-Fahrzeug erstellt wird.
 *
 * Rich Data Pattern: Enthält alle relevanten Daten für Event Handler
 * um DB-Queries zu vermeiden.
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
 */
export class StammFahrzeugCreatedEvent extends DomainEvent {
  constructor(
    public readonly stammFahrzeugId: string,
    public readonly rufname: string,
    public readonly funkrufname: string,
    public readonly fahrzeugtypId: string,
    public readonly createdBy: string,
  ) {
    super(stammFahrzeugId); // aggregateId = stammFahrzeugId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'StammFahrzeugCreated';
  }
}
