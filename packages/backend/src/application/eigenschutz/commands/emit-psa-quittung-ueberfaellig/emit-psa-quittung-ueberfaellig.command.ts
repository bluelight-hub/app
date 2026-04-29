/**
 * Command: Emittiert ein `QuittungUeberfaelligEvent` für eine konkrete
 * `(propagationGroupId, einheitId)`-Bekanntgabe (Story 3.7 AC4).
 *
 * **Auslöser:** Ausschließlich der `RepromptPsaQuittungScheduler` —
 * niemals ein User. Daher trägt der Command auch keinen `callerUserId`.
 *
 * **Idempotenz:** Der Handler prüft via DRY-Helper, ob bereits eine
 * Quittung abgegeben wurde ODER ein Überfällig-Event geschrieben wurde.
 * In beiden Fällen liefert der Handler `{ emitted: false }`.
 *
 * **`originalEventId`** ist die Outbox-Row-ID des `PsaProfilGeaendert`-
 * Events, deren Quittung überfällig ist (Audit-Drill-Down).
 *
 * **`ueberfaelligSeitMin`** wird vom Scheduler zur Laufzeit berechnet
 * (`Math.floor((now - occurredAt) / 60_000)`). Defense-in-Depth:
 * darf > 5 sein, falls der Job aufgrund Backlog/DB-Last später feuert.
 */
export class EmitPsaQuittungUeberfaelligCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly einheitId: string,
    public readonly propagationGroupId: string,
    public readonly originalEventId: string,
    public readonly ueberfaelligSeitMin: number,
    public readonly zuweisungId: string | null,
  ) {}
}
