import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „PSA-Quittung abgegeben" (Story 3.4).
 *
 * Wird vom `AckPsaQuittungHandler` atomar mit der `PsaProfilQuittung`-Row in
 * derselben Transaktion über die Outbox persistiert. Adapter
 * (`infrastructure/eigenschutz/event-adapters/psa-quittung-abgegeben.adapter.ts`)
 * broadcastet anschließend an Room `einsatz:{einsatzId}` über den Channel
 * `eigenschutz:psa-quittung-abgegeben`, damit der Sender-Counter auf der
 * Stab-Sicht (`AcknowledgmentStatusBadge`) live aktualisiert.
 *
 * **Idempotenz:** Eine doppelte Quittung (Re-Click, Doppel-Send, WS-Replay
 * nach Reconnect) landet nicht als zweites Event in der Outbox — der Handler
 * fängt den `P2002`-Constraint-Violation der Tabelle `PsaProfilQuittung`
 * (`@@unique([propagationGroupId, einheitId])`) ab und unterdrückt das
 * Event-Write (Story 3.4 AC3).
 *
 * **propagationGroupId Pflicht:** Anders als beim Sicherheitsregel-Quittiert-
 * Event ist `propagationGroupId` hier nicht-optional — eine PSA-Quittung
 * bezieht sich immer auf eine konkrete Bekanntgabe-Gruppe. Wenn die
 * dazugehörige `PsaProfilGeaendert`-Outbox-Row aus der Retention gefallen
 * ist, lehnt der Handler den Vorgang mit `NotFound:PsaPropagation` ab —
 * statt einem Event mit `null`-Group.
 */
export class QuittungAbgegebenEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly propagationGroupId: string,
    public readonly quittiertAm: Date,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? propagationGroupId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.QUITTUNG_ABGEGEBEN;
  }
}
