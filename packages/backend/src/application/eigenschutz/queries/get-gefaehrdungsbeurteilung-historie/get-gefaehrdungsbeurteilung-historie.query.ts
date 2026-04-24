/**
 * Query zum Laden der Versions-Historie einer Gefährdungsbeurteilung
 * (Story 2.4, GET `…/gefaehrdungsbeurteilungen/:id/versionen`).
 *
 * Wie beim Get-Query ist `einsatzId` **nicht** bloß Permission-Scope, sondern
 * Teil der fachlichen Identität: eine Beurteilung in einem fremden Einsatz
 * führt zu `NotFound:Beurteilung` (symmetrisch zum Cross-Einsatz-Check im
 * Get-Handler, damit Existenz-Leaks über Einsatz-Grenzen hinweg vermieden
 * werden).
 */
export class GetGefaehrdungsbeurteilungHistorieQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly gefaehrdungsbeurteilungId: string,
  ) {}
}
