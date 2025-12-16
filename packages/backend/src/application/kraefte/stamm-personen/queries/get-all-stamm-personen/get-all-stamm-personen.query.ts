/**
 * Query zum Abrufen aller Stamm-Personen mit optionalem Archive-Filter.
 *
 * **Sortierung:**
 * Repository sortiert nach: nachname ASC (alphabetisch)
 *
 * **Eager Loading:**
 * KRITISCH: Handler muss Qualifikationen-Daten eager loaden (verhindert N+1 Queries!)
 * Repository nutzt `include: { qualifikationen: { include: { qualifikation: true } } }`
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Application Layer Query
 */
export class GetAllStammPersonenQuery {
  constructor(public readonly includeArchived?: boolean) {}
}
