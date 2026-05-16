import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Vorfall geschlossen" (Issue #415).
 *
 * Wird vom `CloseVorfallHandler` atomar mit dem Closure-Update in derselben
 * Transaktion über die Outbox persistiert. Konsumenten:
 * - `RecalculateAmpelProjectionOnEigenschutzEventHandler` — `offeneVorfaelle`
 *   muss neu gezählt werden, sobald ein Vorfall geschlossen ist.
 * - Live-Updates der Vorfall-Liste (Tab GESCHLOSSEN bekommt neuen Eintrag).
 *
 * **Payload-Diät (PII-Schutz, Pattern Story 3.6 `LueckeGemeldetEvent`):**
 * Nur Identifier + Audit-Felder — `schliessungsBegruendung` wird NICHT ins
 * Event gespiegelt (analog zu `VorfallGemeldetEvent`, das `was`/`massnahmen`
 * nicht spiegelt). Konsumenten lesen die Begründung bei Bedarf über das
 * Repository.
 */
export class VorfallGeschlossenEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly vorfallId: string,
    public readonly geschlossenAm: Date,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? vorfallId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.VORFALL_GESCHLOSSEN;
  }
}
