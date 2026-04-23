/**
 * Query zum Laden einer einzelnen Gefährdungsbeurteilung samt Persistenz-
 * Metadaten (Story 2.1, GET `…/gefaehrdungsbeurteilungen/:id`).
 *
 * Die `einsatzId` ist **nicht** bloß ein Permission-Scope, sondern Teil der
 * fachlichen Identität der Ressource: wenn die Beurteilung einer anderen
 * Einsatz-ID zugeordnet ist, liefert der Handler `NotFound:Beurteilung`
 * (kein 403), um Existenz-Leaks über Route-Scope-Grenzen hinweg zu
 * vermeiden — symmetrisch zum AC6-Cross-Einsatz-Check im Create-Handler.
 */
export class GetGefaehrdungsbeurteilungQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly gefaehrdungsbeurteilungId: string,
  ) {}
}
