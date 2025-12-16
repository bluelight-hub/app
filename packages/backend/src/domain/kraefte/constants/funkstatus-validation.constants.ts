/**
 * Zentrale Validierungs-Konstanten für FunkStatusConfig Aggregate.
 *
 * **WARUM ein separates Constants-File?**
 *
 * 1. **Single Source of Truth:**
 *    - Validation-Rules wären sonst in 3 Stellen dupliziert (Command, DTO, Aggregate)
 *    - Bei Änderung der Business Rules müsste man 3 Dateien ändern
 *    - Fehleranfällig: Vergisst man eine Stelle, entsteht Inkonsistenz
 *
 * 2. **DRY Principle (Don't Repeat Yourself):**
 *    - Reduziert Code-Duplikation
 *    - Verbessert Wartbarkeit und Lesbarkeit
 *
 * 3. **Architektur-Layering konform:**
 *    - Domain Layer darf keine Application/Infrastructure Layer importieren
 *    - Application Layer (Command, DTO) DARF Domain Layer importieren
 *    - Konstanten im Domain Layer sind für alle Layer verfügbar
 *
 * 4. **Testbarkeit:**
 *    - Tests können diese Konstanten nutzen um Edge-Cases zu generieren
 *
 * 5. **OpenAPI/Swagger Integration:**
 *    - DTOs können diese Werte in @ApiProperty() decorators nutzen
 *    - Generierte API-Dokumentation zeigt exakte Constraints
 *
 * **FunkStatusConfig Domain Rules:**
 * - Funkstatus 0-6 sind SYSTEM-DEFINIERT (Read-Only, nicht änderbar)
 * - Funkstatus 7-9 sind BENUTZER-DEFINIERT (Editierbar)
 * - Code muss Integer zwischen 0 und 9 sein
 * - Farbe muss Hex-Format (#RRGGBB) haben
 */

/**
 * FunkStatus Code Constraints.
 * Funkstatus sind auf Codes 0-9 beschränkt.
 */
export const FUNKSTATUS_VALIDATION = {
  /** Minimum Code-Wert (0 = Einsatzbereit FMS) */
  CODE_MIN: 0,
  /** Maximum Code-Wert (9 = Frei wählbar) */
  CODE_MAX: 9,
  /** Editierbare Status Codes (benutzer-definiert) */
  EDITABLE_CODES: [7, 8, 9] as const,
  /** Read-Only Status Codes (system-definiert) */
  READ_ONLY_CODES: [0, 1, 2, 3, 4, 5, 6] as const,
  /** Maximum Länge für Label (Standard oder Custom) */
  LABEL_MAX_LENGTH: 100,
  /** Hex Color Pattern (#RRGGBB) */
  COLOR_HEX_PATTERN: /^#[0-9A-Fa-f]{6}$/,
  /** Maximum Länge für Beschreibung */
  BESCHREIBUNG_MAX_LENGTH: 500,
} as const;

/**
 * Validation Error Messages (German, User-Facing).
 */
export const FUNKSTATUS_VALIDATION_ERRORS = {
  CODE_OUT_OF_RANGE: `Code muss zwischen ${FUNKSTATUS_VALIDATION.CODE_MIN} und ${FUNKSTATUS_VALIDATION.CODE_MAX} liegen`,
  CODE_READ_ONLY: 'Status 0-6 sind system-definiert und können nicht geändert werden',
  LABEL_TOO_LONG: `Label darf maximal ${FUNKSTATUS_VALIDATION.LABEL_MAX_LENGTH} Zeichen haben`,
  INVALID_COLOR_FORMAT: 'Farbe muss Hex-Format haben (#RRGGBB)',
  BESCHREIBUNG_TOO_LONG: `Beschreibung darf maximal ${FUNKSTATUS_VALIDATION.BESCHREIBUNG_MAX_LENGTH} Zeichen haben`,
} as const;
