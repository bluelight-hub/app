import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine FunkStatusConfig aktualisiert wird.
 *
 * Enthält die geänderten Felder für optimierte Event Handler.
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE String statt Value Objects (FunkStatusConfigId)
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Value Objects sind mutable References (können sich ändern)
 * - Primitive Strings garantieren echte Immutability und einfache Serialisierung
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * **Parameter Konsistenz:**
 * - `funkStatusConfigId: string` ist die kanonische ID (CUID2)
 * - `code: number` ist der Status-Code (0-9) für Business Logic
 * - `aggregateId` wird an DomainEvent Base Class übergeben (selber Wert wie funkStatusConfigId)
 * - Redundanz ist akzeptabel für Event Bus Routing (aggregateId) vs. Domain Logic (funkStatusConfigId)
 *
 * **Changes Object:**
 * - Enthält NUR die geänderten Felder (partial update pattern)
 * - Event Handler können gezielt auf spezifische Änderungen reagieren
 * - code und standardLabel sind NICHT im changes Object (Immutable)
 *
 * **Config-Only Pattern:**
 * - KEIN FunkStatusConfigCreatedEvent - Funkstatus werden via Seed/Migration erstellt
 * - NUR UpdatedEvent - Änderungen an editierbaren Status (7, 8, 9)
 */
export class FunkStatusConfigUpdatedEvent extends DomainEvent {
  constructor(
    public readonly funkStatusConfigId: string,
    public readonly code: number,
    public readonly changes: {
      customLabel?: string;
      farbe?: string;
      istAlarmierbar?: boolean;
      beschreibung?: string;
    },
    public readonly updatedBy: string,
  ) {
    super(funkStatusConfigId); // aggregateId = funkStatusConfigId für Event Bus Routing
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   */
  static override eventName(): string {
    return 'FunkStatusConfigUpdated';
  }
}
