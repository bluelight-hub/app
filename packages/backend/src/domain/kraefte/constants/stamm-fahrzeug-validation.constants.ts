/**
 * Zentrale Validierungs-Konstanten für StammFahrzeug Aggregate.
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
 *    - Beispiel: `'x'.repeat(STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH + 1)` für zu lange Namen
 *
 * 5. **OpenAPI/Swagger Integration:**
 *    - DTOs können diese Werte in @ApiProperty() decorators nutzen
 *    - Generierte API-Dokumentation zeigt exakte Constraints
 *    - Frontend-Validierung kann mit Backend synchron bleiben
 *
 * **Story Context:**
 * Story 2-1 (Stamm-Fahrzeuge verwalten) - Pattern von Story 1-2 übernommen
 */

/**
 * StammFahrzeug Rufname Constraints.
 * Rufname ist die interne Fahrzeugbezeichnung (z.B. "RTW 1", "KTW 2").
 */
export const STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH = 2;
export const STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH = 100;

/**
 * StammFahrzeug Funkrufname Constraints.
 * Funkrufname ist das Funkrufzeichen (z.B. "Rotkreuz 83/1").
 * UNIQUE Constraint in DB.
 */
export const STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH = 2;
export const STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH = 50;

/**
 * StammFahrzeug Kennzeichen Constraints.
 * Kennzeichen ist das Kfz-Kennzeichen (z.B. "DA-RK 101").
 */
export const STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH = 20;

/**
 * StammFahrzeug BOS-Funkkennung Constraints.
 * BOS-Funkkennung ist die Funkkennung im BOS-Netz.
 */
export const STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH = 50;

/**
 * StammFahrzeug Baujahr Constraints.
 * Baujahr muss realistisch sein (frühestes Jahr: 1900).
 */
export const STAMM_FAHRZEUG_BAUJAHR_MIN = 1900;

/**
 * Validation Error Messages (German, User-Facing).
 *
 * **WARUM eigene Error Messages?**
 * - Konsistente Formulierung über alle Layer (Command, DTO, Aggregate)
 * - Einfacher zu übersetzen (zukünftige i18n-Integration)
 * - Zentral änderbar (z.B. Ton formeller/informeller)
 */
export const STAMM_FAHRZEUG_VALIDATION_ERRORS = {
  RUFNAME_TOO_SHORT: `Rufname muss mindestens ${STAMM_FAHRZEUG_RUFNAME_MIN_LENGTH} Zeichen haben`,
  RUFNAME_TOO_LONG: `Rufname darf maximal ${STAMM_FAHRZEUG_RUFNAME_MAX_LENGTH} Zeichen haben`,
  FUNKRUFNAME_TOO_SHORT: `Funkrufname muss mindestens ${STAMM_FAHRZEUG_FUNKRUFNAME_MIN_LENGTH} Zeichen haben`,
  FUNKRUFNAME_TOO_LONG: `Funkrufname darf maximal ${STAMM_FAHRZEUG_FUNKRUFNAME_MAX_LENGTH} Zeichen haben`,
  KENNZEICHEN_TOO_LONG: `Kennzeichen darf maximal ${STAMM_FAHRZEUG_KENNZEICHEN_MAX_LENGTH} Zeichen haben`,
  FUNKKENNUNG_TOO_LONG: `BOS-Funkkennung darf maximal ${STAMM_FAHRZEUG_FUNKKENNUNG_MAX_LENGTH} Zeichen haben`,
  BAUJAHR_INVALID: 'Baujahr muss eine ganze Zahl sein',
  BAUJAHR_TOO_LOW: `Baujahr muss mindestens ${STAMM_FAHRZEUG_BAUJAHR_MIN} sein`,
  FAHRZEUGTYP_ID_REQUIRED: 'Fahrzeugtyp-ID ist erforderlich',
  FAHRZEUGTYP_ID_IMMUTABLE: 'Fahrzeugtyp kann nach Erstellung nicht geändert werden',
} as const;
