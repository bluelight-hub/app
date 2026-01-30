import { validateRequiredString, validateCuid2Format } from '@application/common/validators/string-validator';

/**
 * Query zum Abrufen der Timeline einer Erinnerung.
 *
 * Diese Query laedt alle ETB-Eintraege, die zu einer bestimmten Erinnerung gehoeren.
 * Die Eintraege werden chronologisch sortiert zurueckgegeben (nach createdAt ASC).
 *
 * **Story 5.5: ETB zeigt Erinnerungsverlauf (Timeline Widget)**
 * - Zeigt chronologischen Verlauf aller Erinnerungsaktionen
 * - Filtert nach metadata.erinnerungId
 * - Ermoeglicht Nachvollziehbarkeit des Erinnerungslebenszyklus
 *
 * **Sicherheit:**
 * - einsatzId wird mitgegeben fuer Autorisierungspruefung
 * - Handler validiert, dass Erinnerung zum Einsatz gehoert
 *
 * **Use Cases:**
 * - Timeline-Widget: "Zeige alle Aktionen fuer diese Erinnerung"
 * - Audit-Trail: "Wer hat wann was mit der Erinnerung gemacht?"
 * - Debugging: "Warum ist die Erinnerung in diesem Status?"
 */
export class GetErinnerungTimelineQuery {
  /**
   * Erstellt eine Query zum Abrufen der Erinnerungs-Timeline.
   *
   * Konstruktor-Validierung stellt sicher, dass ungueltige Queries
   * niemals im System existieren (Fail-Fast-Prinzip).
   *
   * @param erinnerungId - Eindeutige ID der Erinnerung (CUID2-Format)
   * @param einsatzId - Eindeutige ID des Einsatzes (CUID2-Format) fuer Autorisierung
   * @throws Error wenn erinnerungId leer oder undefined ist
   * @throws Error wenn erinnerungId kein gueltiges CUID2-Format hat
   * @throws Error wenn einsatzId leer oder undefined ist
   * @throws Error wenn einsatzId kein gueltiges CUID2-Format hat
   *
   * @example
   * ```typescript
   * // Timeline einer Erinnerung abrufen
   * const query = new GetErinnerungTimelineQuery('cm3erinnerung123', 'cm3einsatz456');
   * const result = await handler.execute(query);
   * // result.value = { erinnerungId, titel, events: [...], totalCount }
   *
   * // Validation Error
   * const invalid = new GetErinnerungTimelineQuery('', 'cm3einsatz456'); // Throws Error
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
