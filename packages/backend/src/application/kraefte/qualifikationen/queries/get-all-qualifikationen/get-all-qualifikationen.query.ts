/**
 * Query zum Abrufen aller Qualifikationen mit optionalem Filter.
 */
export class GetAllQualifikationenQuery {
  constructor(public readonly istAktiv?: boolean) {}
}
