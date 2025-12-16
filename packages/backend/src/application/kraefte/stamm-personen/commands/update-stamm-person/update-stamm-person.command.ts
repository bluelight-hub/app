import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import {
  STAMM_PERSON_VORNAME_MIN_LENGTH,
  STAMM_PERSON_VORNAME_MAX_LENGTH,
  STAMM_PERSON_NACHNAME_MIN_LENGTH,
  STAMM_PERSON_NACHNAME_MAX_LENGTH,
  STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH,
  STAMM_PERSON_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/stamm-person-validation.constants';

/**
 * Command zum Aktualisieren einer Stamm-Person.
 *
 * Alle Felder außer id und updatedBy sind optional.
 * Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate).
 *
 * **WICHTIG: personalnummer ist NICHT enthalten!**
 * - Personalnummer ist IMMUTABLE nach Erstellung (siehe StammPerson Aggregate)
 * - Business Rule: Wie Employee ID - fundamentale Eigenschaft
 * - Bei Personalnummer-Änderung muss neue StammPerson erstellt werden
 * - Aggregate.update() würde personalnummer-Änderung ablehnen (Result.fail)
 *
 * **Qualifikationen (vollständiger Ersatz):**
 * - qualifikationIds wird komplett ersetzt, nicht gemerged
 * - Handler prüft Existenz aller Qualifikationen VOR save()
 * - M:N Junction Table wird komplett neu synchronisiert
 */
export class UpdateStammPersonCommand {
  private constructor(
    public readonly id: string,
    public readonly updatedBy: string,
    public readonly vorname?: string,
    public readonly nachname?: string,
    public readonly funkkenungBOS?: string,
    public readonly qualifikationIds?: string[],
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Validiert nur gesetzte optionale Felder.
   * Normalisiert empty strings zu undefined.
   */
  static create(props: { id: string; updatedBy: string; vorname?: string; nachname?: string; funkkenungBOS?: string; qualifikationIds?: string[] }): Result<UpdateStammPersonCommand> {
    // Validation: ID
    if (!props.id || props.id.trim().length === 0) {
      return Result.fail<UpdateStammPersonCommand>('ID ist erforderlich');
    }

    // Validation: updatedBy (CUID2 Format - konsistent mit Create/Archive Commands)
    const trimmedUpdatedBy = props.updatedBy?.trim() ?? '';
    if (trimmedUpdatedBy.length === 0) {
      return Result.fail<UpdateStammPersonCommand>('updatedBy ist erforderlich');
    }
    if (!isCuid(trimmedUpdatedBy)) {
      return Result.fail<UpdateStammPersonCommand>('updatedBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation: Vorname (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.vorname !== undefined) {
      if (props.vorname.trim().length < STAMM_PERSON_VORNAME_MIN_LENGTH) {
        return Result.fail<UpdateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_SHORT);
      }
      if (props.vorname.trim().length > STAMM_PERSON_VORNAME_MAX_LENGTH) {
        return Result.fail<UpdateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG);
      }
    }

    // Validation: Nachname (wenn gesetzt) - nutzt Domain-Konstanten für Single Source of Truth
    if (props.nachname !== undefined) {
      if (props.nachname.trim().length < STAMM_PERSON_NACHNAME_MIN_LENGTH) {
        return Result.fail<UpdateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_SHORT);
      }
      if (props.nachname.trim().length > STAMM_PERSON_NACHNAME_MAX_LENGTH) {
        return Result.fail<UpdateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_LONG);
      }
    }

    // Validation und Normalisierung: FunkkenungBOS (wenn gesetzt)
    const trimmedFunkkenungBOS = props.funkkenungBOS?.trim();
    const funkkenungBOS = trimmedFunkkenungBOS && trimmedFunkkenungBOS.length > 0 ? trimmedFunkkenungBOS : undefined;
    // Validation: FunkkenungBOS - Max-Length (Defense-in-Depth)
    if (funkkenungBOS && funkkenungBOS.length > STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH) {
      return Result.fail<UpdateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.FUNKKENNUNG_BOS_TOO_LONG);
    }

    // Validation: QualifikationIds (wenn gesetzt, aber wenn gesetzt dann CUID2 Format)
    const qualifikationIds = props.qualifikationIds;
    if (qualifikationIds !== undefined) {
      for (const id of qualifikationIds) {
        if (!isCuid(id)) {
          return Result.fail<UpdateStammPersonCommand>(`Ungültige Qualifikation-ID: ${id} (kein gültiger CUID2)`);
        }
      }

      // Check for duplicate qualifikationIds
      const uniqueQualifikationIds = new Set(qualifikationIds);
      if (uniqueQualifikationIds.size !== qualifikationIds.length) {
        return Result.fail<UpdateStammPersonCommand>('Qualifikation-IDs enthalten Duplikate');
      }
    }

    return Result.ok<UpdateStammPersonCommand>(new UpdateStammPersonCommand(props.id.trim(), props.updatedBy.trim(), props.vorname?.trim(), props.nachname?.trim(), funkkenungBOS, qualifikationIds));
  }
}
