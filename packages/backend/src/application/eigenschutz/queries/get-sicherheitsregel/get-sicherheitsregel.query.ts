/**
 * Query zum Laden einer einzelnen Sicherheitsregel samt Persistenz-Metadaten
 * (Story 2.6, GET `…/sicherheitsregeln/:id`).
 *
 * Die `einsatzId` ist **nicht** nur Permission-Scope, sondern Teil der
 * fachlichen Identität der Ressource: gehört die Regel zu einem anderen
 * Einsatz, liefert der Handler `NotFound:Sicherheitsregel` (kein 403), damit
 * keine Existenz über Route-Scope-Grenzen hinweg leakt — symmetrisch zum
 * Cross-Einsatz-Check im Get-Gefährdungsbeurteilungs-Handler.
 */
export class GetSicherheitsregelQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly regelId: string,
  ) {}
}
