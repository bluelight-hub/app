/**
 * Query zum Abrufen eines einzelnen Stamm-Fahrzeugs nach ID.
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Query
 */
export class GetStammFahrzeugByIdQuery {
  constructor(public readonly id: string) {}
}
