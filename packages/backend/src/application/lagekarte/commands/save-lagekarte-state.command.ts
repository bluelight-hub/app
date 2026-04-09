/**
 * Command zum Speichern des Lagekarte-Zeichnungs-States.
 *
 * Ersetzt den direkten Repository-Zugriff im Legacy Controller durch
 * ein CQRS-Command mit Event-Publishing (Issue #638).
 *
 * @see SaveLagekarteStateCommandHandler
 */
export class SaveLagekarteStateCommand {
  constructor(
    /** ID des Einsatzes, dessen Lagekarte aktualisiert wird */
    public readonly einsatzId: string,
    /** GeoJSON FeatureCollection als plain object */
    public readonly state: object,
    /** ID des Users, der die Änderung durchführt */
    public readonly userId: string,
  ) {}
}
