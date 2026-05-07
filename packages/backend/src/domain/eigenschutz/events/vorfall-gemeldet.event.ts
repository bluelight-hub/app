import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Vorfall gemeldet" (Story 5.1, FR31/FR32).
 *
 * Wird vom `ReportVorfallHandler` atomar mit dem Aggregate-Insert in derselben
 * Transaktion über die Outbox persistiert. Konsumenten kommen aus Story 5.3
 * (Vorfall-Liste Live-Update — eigene Hook-Story trägt den WS-Adapter) und
 * Story 7.x (Telemetrie).
 *
 * **Payload-Diät (PII-Schutz, Pattern Story 3.6 `LueckeGemeldetEvent`):**
 * Nur Identifier + Audit-Felder — `was`, `wo`, `beteiligte`, `massnahmen` und
 * `kontextSnapshot` werden NICHT ins Event gespiegelt. Konsumenten lesen den
 * Vorfall bei Bedarf über das Repository (Story 5.3 Liste, Story 5.4/5.5
 * Export). Bandbreite + DSGVO-Konsistenz mit den anderen Eigenschutz-Events.
 */
export class VorfallGemeldetEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly vorfallId: string,
    public readonly vorfallZeit: Date,
    public readonly unfallkasseRelevant: boolean,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? vorfallId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.VORFALL_GEMELDET;
  }
}
