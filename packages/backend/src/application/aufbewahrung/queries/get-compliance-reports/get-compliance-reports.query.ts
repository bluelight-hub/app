/**
 * Query zum Abrufen der Compliance-Reports.
 *
 * Optional filterbar nach Einsatz-ID.
 *
 * @remarks Story 5.5 AC4
 */
export class GetComplianceReportsQuery {
  constructor(
    /** Optionale Einsatz-ID zum Filtern */
    public readonly einsatzId?: string,
  ) {}
}
