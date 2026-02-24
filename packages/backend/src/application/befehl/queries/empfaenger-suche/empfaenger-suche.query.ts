/**
 * Query zur Suche von Empfaengern in Kraefte-Stammdaten.
 *
 * Durchsucht EinsatzPersonen und StammPersonen fuer die
 * Empfaenger-Auswahl bei der Befehlserstellung.
 */
export class EmpfaengerSucheQuery {
  constructor(
    public readonly searchTerm: string,
    public readonly einsatzId: string,
  ) {}
}
