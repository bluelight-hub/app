/**
 * Command für `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/sicherungsposten/:postenId/aufloesen`
 * (Story 4.1, AC6+AC8 + UX-DR27).
 */
export class AufloeseSicherungspostenCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly postenId: string,
    public readonly userId: string,
    public readonly expectedVersion: number,
    public readonly begruendung: string,
  ) {}
}
