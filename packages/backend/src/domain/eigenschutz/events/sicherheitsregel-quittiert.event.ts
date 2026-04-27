import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Sicherheitsregel quittiert" (Story 2.7).
 *
 * Wird vom `AckSicherheitsregelHandler` atomar mit der `SicherheitsregelQuittung`-
 * Row in derselben Transaktion über die Outbox persistiert.
 *
 * **Idempotenz:** Eine doppelte Quittung (Re-Click, Doppel-Send, Re-Replay)
 * landet **nicht** als zweites Event in der Outbox — der Handler fängt den
 * `P2002`-Constraint-Violation der Tabelle `SicherheitsregelQuittung`
 * (`@@unique([regelId, einheitId])`) ab und unterdrückt das Event-Write
 * (Story 2.7 AC3).
 *
 * **propagationGroupId:** Trägt die Gruppen-ID der jüngsten
 * `SicherheitsregelAusgerufen`-Outbox-Row dieser Regel — verlinkt die Quittung
 * audit-mäßig zu „dieser logische Bekanntgabe-Schritt". Wenn der Outbox-Eintrag
 * bereits aus der Retention gefallen ist, fällt der Wert auf `null` zurück
 * (Audit-Trace-Bruch wird im Handler geloggt, kein Throw — Story 2.7 Dev Notes
 * „propagationGroupId-Vererbung").
 *
 * **einheitId Pflicht:** Anders als beim Ausrufen-Event ist `einheitId` hier
 * nicht-optional — eine Quittung ist immer von einer konkreten Einheit. Auch
 * für einsatzweite Regeln (`Sicherheitsregel.einheitId === null`) muss eine
 * konkrete Einheit quittieren (Story 2.7 AC1/AC4).
 */
export class SicherheitsregelQuittiertEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    userId: string,
    einheitId: string,
    public readonly regelId: string,
    public readonly propagationGroupId: string | null,
    public readonly quittiertAm: Date,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, userId, einheitId, aggregateId ?? regelId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.SICHERHEITSREGEL_QUITTIERT;
  }
}
