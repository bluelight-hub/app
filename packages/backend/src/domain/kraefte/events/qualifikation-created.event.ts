import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine neue Qualifikation erstellt wird.
 *
 * Rich Data Pattern: Enthält alle relevanten Daten für Event Handler
 * um DB-Queries zu vermeiden.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE String statt Value Objects (QualifikationId)
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Value Objects sind mutable References (können sich ändern)
 * - Primitive Strings garantieren echte Immutability und einfache Serialisierung
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Parameter Konsistenz:**
 * - `qualifikationId: string` ist die kanonische ID (CUID2)
 * - `aggregateId` wird an DomainEvent Base Class übergeben (selber Wert)
 * - Redundanz ist akzeptabel für Event Bus Routing (aggregateId) vs. Domain Logic (qualifikationId)
 */
export class QualifikationCreatedEvent extends DomainEvent {
  constructor(
    public readonly qualifikationId: string,
    public readonly name: string,
    public readonly abkuerzung: string,
    public readonly kategorie: string,
    public readonly createdBy: string,
  ) {
    super(qualifikationId); // aggregateId = qualifikationId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'QualifikationCreated';
  }
}
