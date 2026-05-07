/**
 * Query zum Laden eines einzelnen Vorfalls (Story 5.2 AC10, GET
 * `…/vorfaelle/:vorfallId`).
 *
 * Die `einsatzId` ist Teil der fachlichen Identität — gehört der Vorfall
 * zu einem fremden Einsatz, liefert der Handler `NotFound:Vorfall`
 * (kein 403), damit keine Existenz über Route-Scope-Grenzen leakt.
 */
export class GetVorfallByIdQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly vorfallId: string,
  ) {}
}
