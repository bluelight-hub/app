/**
 * Query zum Abrufen aller aktiven Einsatz-Teilnehmer.
 *
 * Wird verwendet um die Funkrufnamen aller Teilnehmer eines Einsatzes zu laden,
 * z.B. für ETB-Absender/Empfänger Autocomplete-Vorschläge.
 */
export class GetAllTeilnehmerQuery {
  constructor(public readonly einsatzId: string) {
    if (!einsatzId || einsatzId.trim().length === 0) {
      throw new Error('einsatzId is required');
    }
  }
}
