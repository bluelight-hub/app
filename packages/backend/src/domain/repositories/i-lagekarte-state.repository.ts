/**
 * Minimaler Port für Legacy State-Persistierung.
 *
 * Kapselt den Zugriff auf den GeoJSON-Zeichnungs-State einer Lagekarte.
 * Wird vom SaveLagekarteStateCommandHandler verwendet, um den State
 * zu lesen und zu aktualisieren (Issue #638).
 *
 * @see SaveLagekarteStateCommand
 */
export interface ILagekarteStateRepository {
  /**
   * Findet eine Lagekarte anhand der Einsatz-ID.
   *
   * @param einsatzId - Eindeutige ID des Einsatzes
   * @returns Minimales Lagekarte-Objekt oder null
   */
  findByEinsatzId(einsatzId: string): Promise<{ id: string; einsatzId: string } | null>;

  /**
   * Lädt den GeoJSON-State einer Lagekarte anhand der Einsatz-ID.
   *
   * @param einsatzId - Eindeutige ID des Einsatzes
   * @returns GeoJSON FeatureCollection als plain object oder null
   */
  getState(einsatzId: string): Promise<object | null>;

  /**
   * Aktualisiert den GeoJSON-State einer Lagekarte.
   *
   * @param id - Eindeutige ID der Lagekarte
   * @param state - GeoJSON FeatureCollection als plain object
   */
  updateState(id: string, state: object): Promise<void>;
}
