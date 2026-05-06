/**
 * Query zum Laden eines einzelnen Sicherungspostens samt Persistenz-Metadaten
 * (Story 4.4, GET `…/sicherungsposten/:postenId`).
 *
 * Die `einsatzId` ist **nicht** nur Permission-Scope, sondern Teil der
 * fachlichen Identität der Ressource: gehört der Sicherungsposten zu einem
 * anderen Einsatz, liefert der Handler `NotFound:Sicherungsposten` (kein 403),
 * damit keine Existenz über Route-Scope-Grenzen hinweg leakt — symmetrisch zum
 * Cross-Einsatz-Check im Get-Sicherheitsregel-Handler.
 */
export class GetSicherungspostenQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly postenId: string,
  ) {}
}
