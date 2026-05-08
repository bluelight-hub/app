/**
 * Rebuild-Command für die Ampel-Projektion eines Einsatzes.
 *
 * MVP-light: Kein Wipe, kein Snapshot-Lauf über Fremdquellen. Der Handler
 * lädt nur die Einsatz-Einheiten und stößt pro Einheit den bestehenden
 * `recalculateForEinheit`-Pfad an.
 */
export class RebuildAmpelProjectionCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly letzteAenderungAm: Date = new Date(),
  ) {}
}

export interface RebuildAmpelProjectionResult {
  recalculated: number;
}
