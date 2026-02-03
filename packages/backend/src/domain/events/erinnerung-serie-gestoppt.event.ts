import { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { EVENT_NAMES } from './event-names';

/**
 * Domain Event das auftritt wenn eine wiederkehrende Serie gestoppt wurde (Story 6.5).
 * Repräsentiert historische Tatsache (Past Tense).
 *
 * **Event-Carried State Transfer:**
 * Event enthält alle relevanten Daten damit Event Handler KEINE DB-Query brauchen.
 *
 * **Mögliche Event Handler:**
 * - ETB-Integration: Automatischer ETB-Eintrag "Wiederkehrende Serie '{titel}' gestoppt"
 * - WebSocket: Real-time Benachrichtigung an Einsatz-Room
 */
export class ErinnerungSerieGestopptEvent extends DomainEvent {
  constructor(
    public readonly erinnerungId: ErinnerungId,
    public readonly einsatzId: EinsatzId,
    public readonly titel: string,
    public readonly totalErstellteInstanzen: number,
    aggregateId?: string,
  ) {
    super(aggregateId);
  }

  /**
   * Static Event Name für type-safe Event Routing.
   *
   * @returns "erinnerung.serie-gestoppt"
   */
  static eventName(): string {
    return EVENT_NAMES.ERINNERUNG.SERIE_GESTOPPT;
  }
}
