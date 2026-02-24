/**
 * Command fuer atomares Update aller Rollenzuweisungen eines Einsatzes.
 *
 * Story 5.2 AC3: PUT-Semantik — ersetzt ALLE Rollen fuer den Einsatz.
 */
export class UpdateEinsatzRollenCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly zuweisungen: ReadonlyArray<{ userId: string; rolle: string }>,
  ) {}
}
