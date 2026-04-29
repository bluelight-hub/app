import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „PSA-Quittung überfällig" (Story 3.7, AR12, UX-DR20).
 *
 * Wird vom `RepromptPsaQuittungScheduler` erzeugt, sobald eine
 * `PsaProfilGeaendert`-Bekanntgabe für eine konkrete Empfänger-Einheit
 * länger als 5 Minuten alt ist und keine zugehörige `PsaProfilQuittung`
 * existiert. Das Event landet zunächst in der Outbox; konsumiert wird es
 * vom WS-Adapter (Empfänger-Re-Prompt + Einsatzleiter-Polite-Eskalation)
 * und in Phase 2 (Story 3.8) zusätzlich vom Push-Notification-Service.
 *
 * **`einheitId` Pflicht:** Das Event ist je Empfänger-Einheit individuell —
 * eine Bulk-Bekanntgabe (Story 3.2) erzeugt potenziell N Überfällig-Events.
 *
 * **`originalEventId`:** ID der `PsaProfilGeaendert`-Outbox-Row, deren
 * Quittung überfällig ist (Audit-Drill-Down).
 *
 * **`ueberfaelligSeitMin`:** Ganze Minuten seit `originalEvent.occurredAt`,
 * vom Scheduler zum Persistierungs-Zeitpunkt berechnet. Defense-in-Depth:
 * kann technisch > 5 sein, falls der Job Backlog hat.
 *
 * **`zuweisungId`:** ID der `PsaProfilZuweisung` aus dem `PsaProfilGeaendert`-
 * Payload — sonst `null` (Adapter rendert den Drill-Down-Link entsprechend).
 *
 * **`userId === 'SYSTEM'`:** Der Scheduler-Lauf ist System-getrieben.
 * Damit das Schema von `EigenschutzDomainEvent` (Pflicht-`userId`) hält,
 * trägt das Event den Sentinel-User `'SYSTEM'` (Pattern:
 * `ErinnerungEskalationsScheduler`). Audit-Tools filtern `userId === 'SYSTEM'`,
 * falls nur menschliche Aktionen anzuzeigen sind.
 */
export class QuittungUeberfaelligEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    einheitId: string,
    public readonly propagationGroupId: string,
    public readonly originalEventId: string,
    public readonly ueberfaelligSeitMin: number,
    public readonly zuweisungId: string | null,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, 'SYSTEM', einheitId, aggregateId ?? `${propagationGroupId}:${einheitId}`, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.QUITTUNG_UEBERFAELLIG;
  }
}
