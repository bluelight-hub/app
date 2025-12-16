import { validateCuid2Format, validateRequiredString } from '@application/common/validators/string-validator';

/**
 * Query zum Abrufen einer RollenDefinition anhand ihrer ID.
 *
 * Diese Query lädt eine einzelne RollenDefinition aus dem System.
 * Wird verwendet für Detail-Ansichten und Update-Formulare.
 *
 * **Warum Query Pattern:**
 * - CQRS: Trennung von Read (Query) und Write (Command)
 * - Explizite Intent: GetRollenDefinitionByIdQuery ≠ generic "fetch by ID"
 * - Testbarkeit: Query-Objekte können isoliert validiert werden
 *
 * **Unterschied zu GetAllRollenDefinitionenQuery:**
 * - GetAllRollenDefinitionenQuery: Lädt alle Rollen (Array, leeres Array ist valide)
 * - GetRollenDefinitionByIdQuery: Lädt eine Rolle (null ist valide Response)
 *
 * **Use Cases:**
 * - Detail-Ansicht: "Zeige Details zu Rolle mit ID X"
 * - Update-Formular: "Lade Rolle X zum Bearbeiten"
 * - Referenz-Checks: "Prüfe ob Rolle X existiert"
 *
 * **Warum null statt Error wenn nicht gefunden:**
 * Die Entscheidung ob "nicht gefunden" ein Fehler ist, liegt beim Controller:
 * - GET /rollen/:id → 404 NOT FOUND (null = valider Fall)
 * - Business Logic → Fehler wenn Rolle MUSS existieren
 * - Query Layer bleibt framework-agnostisch und gibt null zurück
 */
export class GetRollenDefinitionByIdQuery {
  /**
   * Erstellt eine Query zum Abrufen einer RollenDefinition.
   *
   * Konstruktor-Validierung stellt sicher, dass ungültige Queries
   * niemals im System existieren (Fail-Fast-Prinzip).
   *
   * @param id - Eindeutige ID der RollenDefinition (cuid)
   * @throws Error wenn id leer oder undefined ist
   * @throws Error wenn id kein gültiges cuid Format hat
   *
   * @example
   * ```typescript
   * // Valide Query
   * const query = new GetRollenDefinitionByIdQuery('clw3h8x9y0000qwertyuiopas');
   * // → Gibt RollenDefinition zurück (oder null wenn nicht gefunden)
   *
   * // Validation Error (ungültiges CUID-Format)
   * const invalid1 = new GetRollenDefinitionByIdQuery('invalid-id'); // Throws Error
   *
   * // Validation Error (leerer String)
   * const invalid2 = new GetRollenDefinitionByIdQuery(''); // Throws Error
   * ```
   */
  constructor(public readonly id: string) {
    validateRequiredString(id, 'id');
    validateCuid2Format(id, 'id');
  }
}
