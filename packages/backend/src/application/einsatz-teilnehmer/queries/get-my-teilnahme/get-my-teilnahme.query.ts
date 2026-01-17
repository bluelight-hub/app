/**
 * Query zum Abrufen der eigenen Einsatz-Teilnahme eines Users.
 *
 * Wird für ETB-Absender Auto-Fill verwendet um den aktuellen Funkrufnamen zu ermitteln.
 */
export class GetMyTeilnahmeQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly userId: string,
  ) {
    if (!einsatzId || einsatzId.trim().length === 0) {
      throw new Error('einsatzId is required');
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error('userId is required');
    }
  }
}
