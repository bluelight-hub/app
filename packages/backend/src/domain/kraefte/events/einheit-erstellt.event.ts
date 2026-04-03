import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine taktische Einheit erstellt wird.
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "Einheit {name} ({typ}) aufgestellt (Funktion: {funktion})"
 *
 * **Event Immutability:**
 * - Events verwenden PRIMITIVE Strings statt Value Objects
 * - WARUM? Events sind historische Fakten und müssen serialisierbar sein
 * - Event Store / Event Bus benötigt JSON-serialisierbare Daten
 *
 * @example
 * ```typescript
 * // Im EinsatzEinheit.create() Factory:
 * einheit.addDomainEvent(
 *   new EinheitErstelltEvent(
 *     einsatzId,
 *     einheit.id.value,
 *     name,
 *     typ,
 *     funktion,
 *     createdBy,
 *   )
 * );
 * ```
 */
export class EinheitErstelltEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem die Einheit gehört */
    public readonly einsatzId: string,
    /** Einheit-ID (CUID2) der neu erstellten Einheit */
    public readonly einheitId: string,
    /** Name der Einheit (z.B. "1. Bergungsgruppe") */
    public readonly name: string,
    /** Typ der Einheit (TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT) */
    public readonly typ: string,
    /** Funktion der Einheit (optional, z.B. "Bergung") */
    public readonly funktion: string | undefined,
    /** User-ID (CUID2) der die Einheit erstellt hat */
    public readonly createdBy: string,
  ) {
    // aggregateId = einheitId für Event Bus Routing
    super(einheitId);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_einheit.erstellt';
  }
}
