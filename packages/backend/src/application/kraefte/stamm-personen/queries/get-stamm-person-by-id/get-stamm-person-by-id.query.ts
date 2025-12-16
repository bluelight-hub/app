/**
 * Query zum Abrufen einer einzelnen Stamm-Person nach ID.
 *
 * **Eager Loading:**
 * Handler muss Qualifikationen-Daten eager loaden (verhindert N+1 Queries!)
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Query
 */
export class GetStammPersonByIdQuery {
  constructor(public readonly id: string) {}
}
