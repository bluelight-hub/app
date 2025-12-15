/**
 * Zentrale Validierungs-Konstanten für Qualifikation Aggregate.
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
 *    - Beispiel: `'x'.repeat(QUALIFIKATION_NAME_MAX_LENGTH + 1)` für zu lange Namen
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
 * import { QUALIFIKATION_NAME_MIN_LENGTH } from '@domain/kraefte/constants';
 * if (props.name.trim().length < QUALIFIKATION_NAME_MIN_LENGTH) {
 *   return Result.fail('Name zu kurz');
 * }
 *
 * // In DTO:
 * import { QUALIFIKATION_NAME_MIN_LENGTH, QUALIFIKATION_NAME_MAX_LENGTH } from '@domain/kraefte/constants';
 * @MinLength(QUALIFIKATION_NAME_MIN_LENGTH)
 * @MaxLength(QUALIFIKATION_NAME_MAX_LENGTH)
 * name: string;
 *
 * // In Aggregate:
 * import { QUALIFIKATION_NAME_MIN_LENGTH } from '@domain/kraefte/constants';
 * if (props.name.trim().length < QUALIFIKATION_NAME_MIN_LENGTH) {
 *   return Result.fail('Name zu kurz');
 * }
 * ```
 *
 * **Story Context:**
 * Issue aus Story 1-1 (Qualifikationen verwalten) - Validation Report 2025-12-13
 * HIGH Priority: Triple Validation Redundancy
 */

/**
 * Qualifikation Name Constraints.
 */
export const QUALIFIKATION_NAME_MIN_LENGTH = 3;
export const QUALIFIKATION_NAME_MAX_LENGTH = 100;

/**
 * Qualifikation Abkürzung Constraints.
 */
export const QUALIFIKATION_ABKUERZUNG_MIN_LENGTH = 2;
export const QUALIFIKATION_ABKUERZUNG_MAX_LENGTH = 20;

/**
 * Qualifikation Beschreibung Constraints.
 */
export const QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH = 1000;

/**
 * Validation Error Messages (German, User-Facing).
 *
 * **WARUM eigene Error Messages?**
 * - Konsistente Formulierung über alle Layer (Command, DTO, Aggregate)
 * - Einfacher zu übersetzen (zukünftige i18n-Integration)
 * - Zentral änderbar (z.B. Ton formeller/informeller)
 */
export const QUALIFIKATION_VALIDATION_ERRORS = {
  NAME_TOO_SHORT: `Name muss mindestens ${QUALIFIKATION_NAME_MIN_LENGTH} Zeichen haben`,
  NAME_TOO_LONG: `Name darf maximal ${QUALIFIKATION_NAME_MAX_LENGTH} Zeichen haben`,
  ABKUERZUNG_TOO_SHORT: `Abkürzung muss mindestens ${QUALIFIKATION_ABKUERZUNG_MIN_LENGTH} Zeichen haben`,
  ABKUERZUNG_TOO_LONG: `Abkürzung darf maximal ${QUALIFIKATION_ABKUERZUNG_MAX_LENGTH} Zeichen haben`,
  BESCHREIBUNG_TOO_LONG: `Beschreibung darf maximal ${QUALIFIKATION_BESCHREIBUNG_MAX_LENGTH} Zeichen haben`,
} as const;
