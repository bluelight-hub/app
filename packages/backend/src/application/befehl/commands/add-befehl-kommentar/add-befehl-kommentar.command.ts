/**
 * Command zum Hinzufügen eines Kommentars zu einem Befehl.
 * Validierung der Werte erfolgt im Handler (Value Object Factories).
 */
export class AddBefehlKommentarCommand {
  constructor(
    public readonly befehlId: string,
    public readonly authorId: string,
    public readonly text: string,
    public readonly isRueckfrage: boolean,
    public readonly parentId?: string,
  ) {}
}
