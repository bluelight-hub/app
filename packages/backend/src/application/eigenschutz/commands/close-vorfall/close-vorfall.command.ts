/**
 * Command für `POST /api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle/:vorfallId/schliessen`
 * (Issue #415).
 *
 * Additive Closure-Operation auf einem Append-Only-Aggregate. Die optionale
 * Begründung wird vom Handler getrimmt; Empty-String → kein `begruendung`.
 */
export class CloseVorfallCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly vorfallId: string,
    public readonly userId: string,
    public readonly begruendung: string | null,
  ) {}
}
