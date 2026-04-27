/**
 * Query für die Einsatz-scope Liste aller aktiven Sicherheitsregeln
 * (Story 2.6 AC6).
 *
 * **`einheitId`-Semantik:**
 * - `undefined` → alle aktiven Regeln des Einsatzes (einsatzweit + alle Einheiten)
 * - `null` → nur einsatzweite Regeln (`einheitId IS NULL`)
 * - `string` → einsatzweite Regeln PLUS Regeln dieser konkreten Einheit
 *   (für Story 2.7 / Abschnittsleiter-Sicht)
 */
export class ListSicherheitsregelnQuery {
  constructor(
    readonly einsatzId: string,
    readonly einheitId?: string | null,
  ) {}
}
