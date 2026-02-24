/**
 * Command zum Aktualisieren der DSGVO-Aufbewahrungskonfiguration.
 *
 * @remarks Story 5.5 AC1
 */
export class UpdateAufbewahrungsKonfigurationCommand {
  constructor(
    public readonly aufbewahrungsfristJahre: number,
    public readonly freigabeperiodeTage: number,
    public readonly automatischLoeschenAktiv: boolean,
    public readonly geaendertVon: string,
  ) {}
}
