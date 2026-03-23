/**
 * Query fuer Abruf der eigenen Rollenzuweisung im Einsatz.
 *
 * Story 4.3 AC1: GET /api/v-alpha/einsaetze/:id/meine-rolle
 */
export class GetMeineEinsatzRolleQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
    /** System-Rolle des Users aus JWT (ADMIN/SUPER_ADMIN/USER). Vermeidet unnoetige DB-Abfrage. */
    public readonly userRole?: string,
  ) {}
}
