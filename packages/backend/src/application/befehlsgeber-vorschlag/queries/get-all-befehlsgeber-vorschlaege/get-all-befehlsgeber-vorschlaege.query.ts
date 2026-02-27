/** Query zum Abrufen aller BefehlsgeberVorschlaege. */
export class GetAllBefehlsgeberVorschlaegeQuery {
  constructor(public readonly istAktiv?: boolean) {}
}
