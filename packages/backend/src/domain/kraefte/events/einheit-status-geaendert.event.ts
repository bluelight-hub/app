import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn sich der Status einer taktischen Einheit ändert.
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "Einheit {name}: Status geändert von {alterStatus} auf {neuerStatus}"
 *
 * **Idempotenz:**
 * - Wird NICHT emittiert wenn alter und neuer Status identisch sind
 * - Aggregate prüft Idempotenz vor Event-Emission
 *
 * @example
 * ```typescript
 * // Im EinsatzEinheit.changeStatus():
 * einheit.addDomainEvent(
 *   new EinheitStatusGeaendertEvent(
 *     einsatzId,
 *     einheit.id.value,
 *     einheit.name,
 *     alterStatus,
 *     neuerStatus,
 *     updatedBy,
 *   )
 * );
 * ```
 */
export class EinheitStatusGeaendertEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem die Einheit gehört */
    public readonly einsatzId: string,
    /** Einheit-ID (CUID2) der geänderten Einheit */
    public readonly einheitId: string,
    /** Name der Einheit (denormalisiert für ETB) */
    public readonly name: string,
    /** Vorheriger Status der Einheit */
    public readonly alterStatus: string,
    /** Neuer Status der Einheit */
    public readonly neuerStatus: string,
    /** User-ID (CUID2) der den Status geändert hat */
    public readonly updatedBy: string,
  ) {
    // aggregateId = einheitId für Event Bus Routing
    super(einheitId);
  }

  /**
   * Eindeutiger Event Name (Past Tense).
   * Verwendet für Event Bus Routing und @OnEvent() Decorator.
   */
  static override eventName(): string {
    return 'einsatz_einheit.status_geaendert';
  }
}
