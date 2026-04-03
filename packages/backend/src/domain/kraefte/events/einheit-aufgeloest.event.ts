import { DomainEvent } from '@domain/common/domain-event';

/**
 * Domain Event das emittiert wird wenn eine taktische Einheit aufgelöst wird.
 *
 * Wird zusätzlich zu EinheitStatusGeaendertEvent emittiert wenn der Status
 * auf AUFGELOEST gesetzt wird. Ermöglicht spezifische Reaktionen auf Auflösung
 * (z.B. Benachrichtigungen, Ressourcen-Freigabe).
 *
 * Dieses Event triggert die automatische ETB-Eintragerstellung:
 * - "Einheit {name} aufgelöst"
 *
 * @example
 * ```typescript
 * // Im EinsatzEinheit.changeStatus() wenn neuerStatus === AUFGELOEST:
 * einheit.addDomainEvent(
 *   new EinheitAufgeloestEvent(
 *     einsatzId,
 *     einheit.id.value,
 *     einheit.name,
 *     updatedBy,
 *   )
 * );
 * ```
 */
export class EinheitAufgeloestEvent extends DomainEvent {
  constructor(
    /** Einsatz-ID (UUID) zu dem die Einheit gehört */
    public readonly einsatzId: string,
    /** Einheit-ID (CUID2) der aufgelösten Einheit */
    public readonly einheitId: string,
    /** Name der Einheit (denormalisiert für ETB) */
    public readonly name: string,
    /** User-ID (CUID2) der die Einheit aufgelöst hat */
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
    return 'einsatz_einheit.aufgeloest';
  }
}
