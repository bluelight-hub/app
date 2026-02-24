/**
 * Query zum Export aller Befehle eines Einsatzes.
 *
 * Unterstuetzt CSV- und JSON-Format fuer die Nachbereitung.
 *
 * **Story 4.4: Befehlsdaten-Export fuer Nachbereitung**
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Repository: Nutzt findByEinsatzId() fuer Datenabruf
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 */
export class ExportBefehleQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly format: 'csv' | 'json',
  ) {}
}
