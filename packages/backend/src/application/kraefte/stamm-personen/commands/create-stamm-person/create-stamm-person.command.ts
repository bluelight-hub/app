import { Result } from '@domain/common/result';
import { isCuid } from '@paralleldrive/cuid2';
import {
  STAMM_PERSON_VORNAME_MIN_LENGTH,
  STAMM_PERSON_VORNAME_MAX_LENGTH,
  STAMM_PERSON_NACHNAME_MIN_LENGTH,
  STAMM_PERSON_NACHNAME_MAX_LENGTH,
  STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH,
  STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH,
  STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH,
  STAMM_PERSON_VALIDATION_ERRORS,
} from '@domain/kraefte/constants/stamm-person-validation.constants';

/**
 * Command zum Erstellen einer neuen Stamm-Person.
 *
 * Kapselt alle erforderlichen Daten für die StammPerson-Erstellung.
 * Validation findet in der Factory-Methode statt (Result Pattern).
 *
 * **Validation Strategy:**
 * - Nutzt zentrale Domain-Konstanten aus `stamm-person-validation.constants.ts`
 * - Validiert MIN- und MAX-Längen (Defense-in-Depth vor Aggregate)
 * - CUID2-Validierung für qualifikationIds und createdBy
 * - Optionale Felder werden zu undefined normalisiert (empty string → undefined)
 *
 * **Personalnummer Uniqueness:**
 * - Handler prüft Uniqueness VOR Aggregate-Erstellung (UX-Optimierung)
 * - Datenbank hat ZUSÄTZLICH Unique Constraint (autoritative Quelle)
 *
 * **Qualifikationen:**
 * - qualifikationIds ist optional (kann leer sein)
 * - Handler prüft Existenz aller Qualifikationen VOR save()
 */
export class CreateStammPersonCommand {
  private constructor(
    public readonly vorname: string,
    public readonly nachname: string,
    public readonly personalnummer: string,
    public readonly createdBy: string,
    public readonly funkkenungBOS?: string,
    public readonly qualifikationIds?: string[],
  ) {}

  /**
   * Factory-Methode mit Validierung.
   *
   * Validiert alle Pflichtfelder und optionale Felder (wenn gesetzt).
   * Normalisiert empty strings zu undefined für optionale Felder.
   *
   * @param props - Command Properties
   * @returns Result<CreateStammPersonCommand> - Success oder Failure mit Fehlermeldung
   */
  static create(props: { vorname: string; nachname: string; personalnummer: string; createdBy: string; funkkenungBOS?: string; qualifikationIds?: string[] }): Result<CreateStammPersonCommand> {
    // Validation: Vorname - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.vorname || props.vorname.trim().length < STAMM_PERSON_VORNAME_MIN_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_SHORT);
    }
    // Validation: Vorname - Max-Length (Defense-in-Depth, fängt zu lange Werte früh ab)
    if (props.vorname.trim().length > STAMM_PERSON_VORNAME_MAX_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG);
    }

    // Validation: Nachname - Min-Length (nutzt Domain-Konstanten für Single Source of Truth)
    if (!props.nachname || props.nachname.trim().length < STAMM_PERSON_NACHNAME_MIN_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_SHORT);
    }
    // Validation: Nachname - Max-Length (Defense-in-Depth)
    if (props.nachname.trim().length > STAMM_PERSON_NACHNAME_MAX_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.NACHNAME_TOO_LONG);
    }

    // Validation: Personalnummer - Min-Length
    if (!props.personalnummer || props.personalnummer.trim().length < STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.PERSONALNUMMER_TOO_SHORT);
    }
    // Validation: Personalnummer - Max-Length
    if (props.personalnummer.trim().length > STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.PERSONALNUMMER_TOO_LONG);
    }

    // Validation: createdBy (CUID2 Format)
    if (!props.createdBy || props.createdBy.trim().length === 0) {
      return Result.fail<CreateStammPersonCommand>('createdBy ist erforderlich für Audit-Trail');
    }
    if (!isCuid(props.createdBy.trim())) {
      return Result.fail<CreateStammPersonCommand>('createdBy muss ein gültiger CUID2-Identifier sein');
    }

    // Validation und Normalisierung: FunkkenungBOS (optional)
    const trimmedFunkkenungBOS = props.funkkenungBOS?.trim();
    const funkkenungBOS = trimmedFunkkenungBOS && trimmedFunkkenungBOS.length > 0 ? trimmedFunkkenungBOS : undefined;
    // Validation: FunkkenungBOS - Max-Length (Defense-in-Depth)
    if (funkkenungBOS && funkkenungBOS.length > STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH) {
      return Result.fail<CreateStammPersonCommand>(STAMM_PERSON_VALIDATION_ERRORS.FUNKKENNUNG_BOS_TOO_LONG);
    }

    // Validation: QualifikationIds (optional, aber wenn gesetzt dann CUID2 Format)
    const qualifikationIds = props.qualifikationIds ?? [];
    for (const id of qualifikationIds) {
      if (!isCuid(id)) {
        return Result.fail<CreateStammPersonCommand>(`Ungültige Qualifikation-ID: ${id} (kein gültiger CUID2)`);
      }
    }

    // Check for duplicate qualifikationIds
    const uniqueQualifikationIds = new Set(qualifikationIds);
    if (uniqueQualifikationIds.size !== qualifikationIds.length) {
      return Result.fail<CreateStammPersonCommand>('Qualifikation-IDs enthalten Duplikate');
    }

    return Result.ok<CreateStammPersonCommand>(
      new CreateStammPersonCommand(
        props.vorname.trim(),
        props.nachname.trim(),
        props.personalnummer.trim(),
        props.createdBy.trim(),
        funkkenungBOS,
        qualifikationIds.length > 0 ? qualifikationIds : undefined,
      ),
    );
  }
}
