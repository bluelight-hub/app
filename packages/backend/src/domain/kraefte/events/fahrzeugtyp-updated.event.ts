import { DomainEvent } from '@domain/common/domain-event';
import type { SollbesatzungSchema } from '../types/sollbesatzung.types';

/**
 * Domain Event das emittiert wird wenn ein Fahrzeugtyp aktualisiert wird.
 *
 * Enthält die geänderten Felder für optimierte Event Handler.
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
 *
 * **Changes Object:**
 * - Enthält NUR die geänderten Felder (partial update pattern)
 * - Event Handler können gezielt auf spezifische Änderungen reagieren
 */
export class FahrzeugtypUpdatedEvent extends DomainEvent {
  constructor(
    public readonly fahrzeugtypId: string,
    public readonly changes: {
      code?: string;
      bezeichnung?: string;
      kategorie?: string;
      beschreibung?: string;
      sollbesatzung?: SollbesatzungSchema;
      istAktiv?: boolean;
      sortOrder?: number;
    },
    public readonly updatedBy: string,
  ) {
    super(fahrzeugtypId); // aggregateId = fahrzeugtypId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'FahrzeugtypUpdated';
  }
}
