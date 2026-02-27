/**
 * Command DTO zum Quittieren eines Befehls durch einen Empfänger.
 *
 * Kapselt alle erforderlichen Daten für die Befehl-Quittierung.
 * Validierung der Werte erfolgt im Handler (Value Object Factories).
 */
export class QuittierenBefehlCommand {
  constructor(
    public readonly befehlId: string,
    public readonly empfaengerId: string,
    public readonly quittierungArt: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN',
    public readonly kommentar?: string,
  ) {}
}
