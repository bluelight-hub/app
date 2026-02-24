/**
 * Command zum Anonymisieren abgelaufener Befehle (DSGVO-Cronjob).
 *
 * Wird vom AufbewahrungsCronService ausgeloest wenn die
 * Aufbewahrungsfrist eines Einsatzes abgelaufen ist.
 *
 * @remarks Story 5.5 AC2
 */
export class AnonymisiereAbgelaufeneCommand {
  constructor(
    /** System-User der den Vorgang ausloest (z.B. 'SYSTEM') */
    public readonly durchgefuehrtVon: string,
  ) {}
}
