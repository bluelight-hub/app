/**
 * Zentrale Validierungs-Konstanten für Fahrzeugtyp Aggregate.
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
 *    - Beispiel: `'x'.repeat(FAHRZEUGTYP_CODE_MAX_LENGTH + 1)` für zu lange Codes
 *
 * 5. **OpenAPI/Swagger Integration:**
 *    - DTOs können diese Werte in @ApiProperty() decorators nutzen
 *    - Generierte API-Dokumentation zeigt exakte Constraints
 *    - Frontend-Validierung kann mit Backend synchron bleiben
 *
 * **Alternative Lösungen (und warum sie NICHT gewählt wurden):**
 *
 * A) **Validation nur in Aggregate, Command/DTO nur Struktur:**
 *    - Problem: DTO-Validierung ist wichtig für HTTP Layer (frühe Fehler, bessere UX)
 *    - Problem: OpenAPI-Spec würde keine Constraints zeigen
 *    - Problem: NestJS ValidationPipe würde nicht greifen (mehr Boilerplate)
 *
 * B) **Validation nur in Command/DTO, Aggregate trusted:**
 *    - Problem: Domain Layer verliert Invarianten-Garantie
 *    - Problem: Aggregate könnte aus anderen Quellen (z.B. DB migration) inkonsistent sein
 *    - Problem: Verletzt Domain-Driven Design Prinzipien
 *
 * C) **Konstanten direkt im Aggregate definiert:**
 *    - Problem: Command/DTO müssten Aggregate importieren (circular dependency Gefahr)
 *    - Problem: Aggregate sollte Business Logic enthalten, nicht Konfiguration
 *    - Problem: Schwerer zu finden und zu ändern
 *
 * **Verwendung:**
 *
 * ```typescript
 * // In Command:
 * import { FAHRZEUGTYP_CODE_MIN_LENGTH } from '@domain/kraefte/constants';
 * if (props.code.trim().length < FAHRZEUGTYP_CODE_MIN_LENGTH) {
 *   return Result.fail('Code zu kurz');
 * }
 *
 * // In DTO:
 * import { FAHRZEUGTYP_CODE_MIN_LENGTH, FAHRZEUGTYP_CODE_MAX_LENGTH } from '@domain/kraefte/constants';
 * @MinLength(FAHRZEUGTYP_CODE_MIN_LENGTH)
 * @MaxLength(FAHRZEUGTYP_CODE_MAX_LENGTH)
 * code: string;
 *
 * // In Aggregate:
 * import { FAHRZEUGTYP_CODE_MIN_LENGTH } from '@domain/kraefte/constants';
 * if (props.code.trim().length < FAHRZEUGTYP_CODE_MIN_LENGTH) {
 *   return Result.fail('Code zu kurz');
 * }
 * ```
 *
 * **Story Context:**
 * Story 1-2 (Fahrzeugtypen verwalten) - Pattern von Story 1-1 übernommen
 */

/**
 * Fahrzeugtyp Code Constraints.
 * Code wird auf UPPERCASE normalisiert (z.B. "hlf" → "HLF").
 */
export const FAHRZEUGTYP_CODE_MIN_LENGTH = 2;
export const FAHRZEUGTYP_CODE_MAX_LENGTH = 10;

/**
 * Fahrzeugtyp Bezeichnung Constraints.
 */
export const FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH = 3;
export const FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH = 100;

/**
 * Fahrzeugtyp Beschreibung Constraints.
 */
export const FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH = 1000;

/**
 * Validation Error Messages (German, User-Facing).
 *
 * **WARUM eigene Error Messages?**
 * - Konsistente Formulierung über alle Layer (Command, DTO, Aggregate)
 * - Einfacher zu übersetzen (zukünftige i18n-Integration)
 * - Zentral änderbar (z.B. Ton formeller/informeller)
 */
export const FAHRZEUGTYP_VALIDATION_ERRORS = {
  CODE_TOO_SHORT: `Code muss mindestens ${FAHRZEUGTYP_CODE_MIN_LENGTH} Zeichen haben`,
  CODE_TOO_LONG: `Code darf maximal ${FAHRZEUGTYP_CODE_MAX_LENGTH} Zeichen haben`,
  BEZEICHNUNG_TOO_SHORT: `Bezeichnung muss mindestens ${FAHRZEUGTYP_BEZEICHNUNG_MIN_LENGTH} Zeichen haben`,
  BEZEICHNUNG_TOO_LONG: `Bezeichnung darf maximal ${FAHRZEUGTYP_BEZEICHNUNG_MAX_LENGTH} Zeichen haben`,
  BESCHREIBUNG_TOO_LONG: `Beschreibung darf maximal ${FAHRZEUGTYP_BESCHREIBUNG_MAX_LENGTH} Zeichen haben`,
} as const;
