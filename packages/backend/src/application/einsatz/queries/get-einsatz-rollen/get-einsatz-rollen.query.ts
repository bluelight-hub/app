/**
 * Query fuer Abruf aller Rollenzuweisungen eines Einsatzes.
 *
 * Story 5.2 AC4: GET /api/v-alpha/einsaetze/:id/rollen
 */
export class GetEinsatzRollenQuery {
  constructor(public readonly einsatzId: string) {}
}
