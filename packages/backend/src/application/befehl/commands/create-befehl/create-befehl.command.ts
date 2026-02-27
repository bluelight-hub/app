/**
 * Command DTO zum Erstellen eines neuen Befehls.
 *
 * Kapselt alle erforderlichen und optionalen Daten für die Befehl-Erstellung.
 * Validierung der Werte erfolgt im Handler (Value Object Factories).
 */
export class CreateBefehlCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly empfaenger: { name: string; empfaengerId?: string }[],
    public readonly befehlsgeber: string,
    public readonly erstellerId: string,
    public readonly auftrag: string,
    public readonly zeitvorgabe?: string,
    public readonly ereignis?: string,
    public readonly mittel?: string,
    public readonly ziel?: string,
    public readonly weg?: string,
    public readonly befehlsgeberId?: string,
  ) {}
}
