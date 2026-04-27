/**
 * Query: Listet alle Quittungen einer Sicherheitsregel (Story 2.7 AC10).
 *
 * Wird vom Sender-View / Stab-Dashboard genutzt: „X von N Einheiten haben
 * quittiert". Die Antwort enthält pro Quittung den `einheitName` und
 * (optional) den `quittiertVonUserName` für die Frontend-Renderung ohne
 * Joins.
 */
export class ListSicherheitsregelQuittungenQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly regelId: string,
  ) {}
}
