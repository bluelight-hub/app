/**
 * Command zum Loeschen (Soft-Delete) anonymisierter Befehle nach Freigabeperiode.
 *
 * Wird vom AufbewahrungsCronService ausgeloest wenn die
 * Freigabeperiode nach Anonymisierung abgelaufen ist.
 *
 * @remarks Story 5.5 AC3
 */
export class LoescheAnonymisierteCommand {
  constructor(
    /** System-User der den Vorgang ausloest (z.B. 'SYSTEM') */
    public readonly durchgefuehrtVon: string,
  ) {}
}
