/** Command zum Erstellen eines neuen BefehlsgeberVorschlags. */
export class CreateBefehlsgeberVorschlagCommand {
  constructor(
    public readonly kuerzel: string,
    public readonly label: string,
    public readonly createdBy: string,
    public readonly sortOrder?: number,
  ) {}
}
