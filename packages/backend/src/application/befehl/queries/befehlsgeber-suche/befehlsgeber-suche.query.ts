/** Query fuer die Befehlsgeber-Suche (Vorschlaege + EinsatzPersonen). */
export class BefehlsgeberSucheQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly searchTerm?: string,
  ) {}
}
