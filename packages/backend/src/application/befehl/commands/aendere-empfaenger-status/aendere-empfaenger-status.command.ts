/**
 * Command zum Ändern des Empfänger-Status eines Befehls.
 * Unterstützt: Zustellen, Quittieren, Zurücksetzen.
 */
export class AendereEmpfaengerStatusCommand {
  constructor(
    public readonly befehlId: string,
    public readonly empfaengerEntityId: string,
    public readonly aktion: 'ZUSTELLEN' | 'QUITTIEREN' | 'ZURUECKSETZEN',
    public readonly ausfuehrenderUserId: string,
    public readonly quittierungArt?: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN',
    public readonly kommentar?: string,
    public readonly zielStatus?: 'ERTEILT' | 'ZUGESTELLT',
  ) {}
}
