/**
 * Query zum Abrufen aggregierter Befehlsmetriken.
 *
 * Berechnet Adoptionsrate, Erfassungszeit, Quittierungszeit,
 * Papier-Rueckfallquote und Dokumentationsqualitaet.
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Prisma Direct: Optimierte Aggregation ohne Domain-Aggregate
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
export class GetBefehlMetrikenQuery {
  constructor(
    public readonly vonDatum: Date,
    public readonly bisDatum: Date,
  ) {}
}
