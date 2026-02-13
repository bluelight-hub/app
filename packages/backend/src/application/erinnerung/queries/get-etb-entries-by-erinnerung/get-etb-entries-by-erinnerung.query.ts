import { validateRequiredString, validateCuid2Format } from '@application/common/validators/string-validator';

/**
 * Query zum Abrufen der ETB-Einträge einer Erinnerung.
 *
 * Diese Query lädt alle ETB-Einträge, die zu einer bestimmten Erinnerung gehören.
 * Die Einträge werden chronologisch sortiert zurückgegeben (nach createdAt ASC).
 *
 * **Story 5.7: Bidirektionale Verknüpfung - Erinnerung zu ETB-Einträgen Query**
 * - Zeigt chronologischen Verlauf aller Erinnerungsaktionen
 * - Filtert nach metadata.erinnerungId
 * - Ermöglicht Nachvollziehbarkeit des Erinnerungslebenszyklus
 *
 * **Sicherheit:**
 * - einsatzId wird mitgegeben für Autorisierungsprüfung
 * - Handler validiert, dass Erinnerung zum Einsatz gehört
 *
 * **Use Cases:**
 * - Erinnerungs-Detail: "Zeige alle ETB-Einträge für diese Erinnerung"
 * - Audit-Trail: "Wer hat wann was mit der Erinnerung gemacht?"
 * - Debugging: "Warum ist die Erinnerung in diesem Status?"
 */
export class GetEtbEntriesByErinnerungQuery {
  /**
   * Erstellt eine Query zum Abrufen der ETB-Einträge einer Erinnerung.
   *
   * Konstruktor-Validierung stellt sicher, dass ungültige Queries
   * niemals im System existieren (Fail-Fast-Prinzip).
   *
   * @param erinnerungId - Eindeutige ID der Erinnerung (CUID2-Format)
   * @param einsatzId - Eindeutige ID des Einsatzes (CUID2-Format) für Autorisierung
   * @throws Error wenn erinnerungId leer oder undefined ist
   * @throws Error wenn erinnerungId kein gültiges CUID2-Format hat
   * @throws Error wenn einsatzId leer oder undefined ist
   * @throws Error wenn einsatzId kein gültiges CUID2-Format hat
   *
   * @example
   * ```typescript
   * // ETB-Einträge einer Erinnerung abrufen
   * const query = new GetEtbEntriesByErinnerungQuery('cm3erinnerung123', 'cm3einsatz456');
   * const result = await handler.execute(query);
   * // result.value = { entries: [...], totalCount: 5 }
   *
   * // Validation Error
   * const invalid = new GetEtbEntriesByErinnerungQuery('', 'cm3einsatz456'); // Throws Error
   * ```
   */
  constructor(
    public readonly erinnerungId: string,
    public readonly einsatzId: string,
  ) {
    validateRequiredString(erinnerungId, 'erinnerungId');
    validateCuid2Format(erinnerungId, 'erinnerungId');
    validateRequiredString(einsatzId, 'einsatzId');
    validateCuid2Format(einsatzId, 'einsatzId');
  }
}
