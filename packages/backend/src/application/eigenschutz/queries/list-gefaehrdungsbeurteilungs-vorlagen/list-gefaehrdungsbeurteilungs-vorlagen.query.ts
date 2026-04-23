/**
 * Query zum Laden aller aktiven Gefährdungsbeurteilungs-Vorlagen für einen
 * Einsatz. Die `einsatzId` steuert aktuell nur die Autorisierung — alle
 * Einsätze teilen sich denselben Vorlagen-Pool. Wir führen das Feld trotzdem
 * im Query-Objekt, damit ADR-Compliance (Einsatz-Scope) sichtbar bleibt.
 */
export class ListGefaehrdungsbeurteilungsVorlagenQuery {
  constructor(public readonly einsatzId: string) {}
}
