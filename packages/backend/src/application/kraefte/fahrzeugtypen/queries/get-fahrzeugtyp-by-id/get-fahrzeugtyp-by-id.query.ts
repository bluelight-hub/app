/**
 * Query zum Abrufen eines Fahrzeugtyps nach ID.
 *
 * **NOT_FOUND Error Code (Task 10):**
 * Handler gibt Result.ok(null) zurück wenn nicht gefunden.
 * Controller mapped null zu HTTP 404.
 */
export class GetFahrzeugtypByIdQuery {
  constructor(public readonly id: string) {}
}
