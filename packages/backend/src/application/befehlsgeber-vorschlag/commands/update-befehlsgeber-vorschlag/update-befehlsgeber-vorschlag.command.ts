/** Command zum Aktualisieren eines BefehlsgeberVorschlags. */
export class UpdateBefehlsgeberVorschlagCommand {
  constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly kuerzel?: string,
    public readonly label?: string,
    public readonly sortOrder?: number,
    public readonly istAktiv?: boolean,
  ) {}
}
