/**
 * Zentrale Validierungs-Konstanten für StammPerson Aggregate.
 *
 * **WARUM ein separates Constants-File?**
 *
 * 1. **Single Source of Truth:**
 *    - Validation-Rules waren in 3 Stellen dupliziert (Command, DTO, Aggregate)
 *    - Bei Änderung der Business Rules (z.B. max length) müsste man 3 Dateien ändern
 *    - Fehleranfällig: Vergisst man eine Stelle, entsteht Inkonsistenz
 *
 * 2. **DRY Principle (Don't Repeat Yourself):**
 *    - Reduziert Code-Duplikation von ~15 Zeilen auf 1 Import
 *    - Verbessert Wartbarkeit und Lesbarkeit
 *
 * 3. **Architektur-Layering konform:**
 *    - Domain Layer darf keine Application/Infrastructure Layer importieren
 *    - Application Layer (Command, DTO) DARF Domain Layer importieren
 *    - Konstanten im Domain Layer sind für alle Layer verfügbar
 *
 * 4. **Testbarkeit:**
 *    - Tests können diese Konstanten nutzen um Edge-Cases zu generieren
 *    - Beispiel: `'x'.repeat(STAMM_PERSON_VORNAME_MAX_LENGTH + 1)` für zu lange Namen
 *
 * 5. **OpenAPI/Swagger Integration:**
 *    - DTOs können diese Werte in @ApiProperty() decorators nutzen
 *    - Generierte API-Dokumentation zeigt exakte Constraints
 *    - Frontend-Validierung kann mit Backend synchron bleiben
 *
 * **Story Context:**
 * Story 2-2 (Stamm-Personen verwalten) - Pattern von Story 2-1 (StammFahrzeug) übernommen
 */

/**
 * StammPerson Vorname Constraints.
 * Vorname ist Pflichtfeld für die Person.
 */
export const STAMM_PERSON_VORNAME_MIN_LENGTH = 2;
export const STAMM_PERSON_VORNAME_MAX_LENGTH = 100;

/**
 * StammPerson Nachname Constraints.
 * Nachname ist Pflichtfeld für die Person.
 */
export const STAMM_PERSON_NACHNAME_MIN_LENGTH = 2;
export const STAMM_PERSON_NACHNAME_MAX_LENGTH = 100;

/**
 * StammPerson Personalnummer Constraints.
 * Personalnummer ist die eindeutige Kennung der Person in der Organisation.
 * UNIQUE Constraint in DB.
 */
export const STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH = 1;
export const STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH = 50;

/**
 * StammPerson BOS-Funkkennung Constraints.
 * BOS-Funkkennung ist die Funkkennung im BOS-Netz (optional).
 */
export const STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH = 50;

/**
 * Validation Error Messages (German, User-Facing).
 *
 * **WARUM eigene Error Messages?**
 * - Konsistente Formulierung über alle Layer (Command, DTO, Aggregate)
 * - Einfacher zu übersetzen (zukünftige i18n-Integration)
 * - Zentral änderbar (z.B. Ton formeller/informeller)
 */
export const STAMM_PERSON_VALIDATION_ERRORS = {
  VORNAME_TOO_SHORT: `Vorname muss mindestens ${STAMM_PERSON_VORNAME_MIN_LENGTH} Zeichen haben`,
  VORNAME_TOO_LONG: `Vorname darf maximal ${STAMM_PERSON_VORNAME_MAX_LENGTH} Zeichen haben`,
  NACHNAME_TOO_SHORT: `Nachname muss mindestens ${STAMM_PERSON_NACHNAME_MIN_LENGTH} Zeichen haben`,
  NACHNAME_TOO_LONG: `Nachname darf maximal ${STAMM_PERSON_NACHNAME_MAX_LENGTH} Zeichen haben`,
  PERSONALNUMMER_TOO_SHORT: `Personalnummer muss mindestens ${STAMM_PERSON_PERSONALNUMMER_MIN_LENGTH} Zeichen haben`,
  PERSONALNUMMER_TOO_LONG: `Personalnummer darf maximal ${STAMM_PERSON_PERSONALNUMMER_MAX_LENGTH} Zeichen haben`,
  FUNKKENNUNG_BOS_TOO_LONG: `BOS-Funkkennung darf maximal ${STAMM_PERSON_FUNKKENNUNG_BOS_MAX_LENGTH} Zeichen haben`,
} as const;
