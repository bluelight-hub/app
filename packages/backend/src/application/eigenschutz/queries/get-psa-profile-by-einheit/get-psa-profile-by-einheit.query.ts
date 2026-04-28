/**
 * Query-DTO für „aktive PSA-Profile einer Einheit laden" (Story 3.1 AC9).
 *
 * Liefert die aktuell aktiven Zuweisungen (`gueltigBis IS NULL`) als
 * Read-Model-Liste — sortiert nach Profil-Enum (BASIS, INFEKTION, VU,
 * CBRN_PATIENT, VOLLSCHUTZ).
 */
export class GetPsaProfileByEinheitQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly einheitId: string,
  ) {}
}
