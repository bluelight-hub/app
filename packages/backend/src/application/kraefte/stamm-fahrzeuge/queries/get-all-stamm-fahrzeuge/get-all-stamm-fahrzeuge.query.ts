/**
 * Query zum Abrufen aller Stamm-Fahrzeuge mit optionalem Archive-Filter.
 *
 * **Sortierung:**
 * Repository sortiert nach: rufname ASC (alphabetisch)
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Application Layer Query
 */
export class GetAllStammFahrzeugeQuery {
  constructor(public readonly includeArchived?: boolean) {}
}
