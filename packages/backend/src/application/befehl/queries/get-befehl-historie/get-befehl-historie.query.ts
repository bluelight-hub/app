/**
 * Query zum Abrufen der Befehlshistorie-Timeline.
 *
 * Laedt alle Events eines Befehls und konstruiert eine chronologische
 * Timeline im Paket-Tracking-Style.
 *
 * **Story 4.2: Befehlshistorie-Timeline**
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Prisma Direct: Optimierte Query ohne Domain-Aggregate
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
export class GetBefehlHistorieQuery {
  constructor(public readonly befehlId: string) {}
}
