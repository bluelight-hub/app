import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine Qualifikation aktualisiert wird.
 *
 * Enthält die geänderten Felder für optimierte Event Handler.
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
 *
 * **Changes Object:**
 * - Enthält NUR die geänderten Felder (partial update pattern)
 * - `sortOrder` ist inkludiert (war vorher fehlend)
 * - Event Handler können gezielt auf spezifische Änderungen reagieren
 */
export class QualifikationUpdatedEvent extends DomainEvent {
  constructor(
    public readonly qualifikationId: string,
    public readonly changes: {
      name?: string;
      abkuerzung?: string;
      kategorie?: string;
      beschreibung?: string;
      istAktiv?: boolean;
      sortOrder?: number;
    },
    public readonly updatedBy: string,
  ) {
    super(qualifikationId); // aggregateId = qualifikationId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'QualifikationUpdated';
  }
}
