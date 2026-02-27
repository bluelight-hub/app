/**
 * Command DTO zum Erstellen eines Korrekturbefehls.
 *
 * Kapselt die Original-Befehl-ID und alle Felder fuer den neuen Korrekturbefehl.
 * Validierung der Werte erfolgt im Handler (Value Object Factories).
 */
export class KorrigiereBefehlCommand {
  constructor(
    public readonly originalBefehlId: string,
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
