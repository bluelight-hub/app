/**
 * Query zum Abrufen aller Fahrzeugtypen mit optionalem Filter.
 *
 * **Sortierung (Task 9):**
 * Repository sortiert nach: sortOrder ASC, code ASC
 */
export class GetAllFahrzeugtypenQuery {
  constructor(public readonly istAktiv?: boolean) {}
}
