/**
 * Validierungs-Konstanten für EinsatzEinheit Domain.
 *
 * Zentralisiert Business Rules für Feldlängen und Validierung.
 * Garantiert Konsistenz zwischen Domain Layer, DTOs, und Prisma Schema.
 *
 * **Warum existieren diese Konstanten?**
 *
 * 1. **Single Source of Truth:**
 *    - Validierungsregeln sind zentral definiert
 *    - Verhindert Inkonsistenzen zwischen Domain/DTO/Schema
 *    - Änderungen müssen nur an einer Stelle erfolgen
 *
 * 2. **Domain-Driven Design:**
 *    - Business Rules gehören ins Domain Layer
 *    - DTOs und Controller importieren diese Regeln
 *    - Prisma Schema dokumentiert Limits (via `@db.VarChar(n)`)
 *
 * 3. **Type Safety:**
 *    - `as const` macht Werte immutable und literal
 *    - TypeScript inferiert exakte Werte statt nur `number`
 *    - Fehlermeldungen sind type-safe strings
 *
 * @example
 * ```typescript
 * // In Domain Entity
 * if (name.length > EINSATZ_EINHEIT_VALIDATION.NAME_MAX_LENGTH) {
 *   return Result.fail(EINSATZ_EINHEIT_VALIDATION_ERRORS.NAME_TOO_LONG);
 * }
 *
 * // In DTO (class-validator)
 * @MaxLength(EINSATZ_EINHEIT_VALIDATION.NAME_MAX_LENGTH, {
 *   message: EINSATZ_EINHEIT_VALIDATION_ERRORS.NAME_TOO_LONG
 * })
 * name: string;
 * ```
 */
export const EINSATZ_EINHEIT_VALIDATION = {
  /** Minimale Länge für Name (mindestens 1 Zeichen) */
  NAME_MIN_LENGTH: 1,
  /** Maximale Länge für Name (sync mit Prisma Schema) */
  NAME_MAX_LENGTH: 100,
  /** Maximale Länge für Funktion (sync mit Prisma Schema) */
  FUNKTION_MAX_LENGTH: 100,
  /** Maximale Länge für Auftrag (sync mit Prisma Schema) */
  AUFTRAG_MAX_LENGTH: 500,
  /** Maximale Länge für Einsatzort (sync mit Prisma Schema) */
  EINSATZORT_MAX_LENGTH: 200,
  /** Minimale Soll-Stärke */
  SOLL_STAERKE_MIN: 0,
  /** Maximale Soll-Stärke */
  SOLL_STAERKE_MAX: 9999,
} as const;

/**
 * Vordefinierte Fehlermeldungen für EinsatzEinheit Validierung.
 *
 * Nutzt EINSATZ_EINHEIT_VALIDATION Konstanten für konsistente Error Messages.
 * Fehlermeldungen sind deutsch (Business Language).
 *
 * Format: Beschreibender Text mit konkreten Limits aus VALIDATION Konstanten
 */
export const EINSATZ_EINHEIT_VALIDATION_ERRORS = {
  /** Name darf nicht leer sein */
  NAME_REQUIRED: 'Name ist erforderlich',
  /** Name überschreitet maximale Länge */
  NAME_TOO_LONG: `Name darf maximal ${EINSATZ_EINHEIT_VALIDATION.NAME_MAX_LENGTH} Zeichen lang sein`,
  /** Funktion überschreitet maximale Länge */
  FUNKTION_TOO_LONG: `Funktion darf maximal ${EINSATZ_EINHEIT_VALIDATION.FUNKTION_MAX_LENGTH} Zeichen lang sein`,
  /** Auftrag überschreitet maximale Länge */
  AUFTRAG_TOO_LONG: `Auftrag darf maximal ${EINSATZ_EINHEIT_VALIDATION.AUFTRAG_MAX_LENGTH} Zeichen lang sein`,
  /** Einsatzort überschreitet maximale Länge */
  EINSATZORT_TOO_LONG: `Einsatzort darf maximal ${EINSATZ_EINHEIT_VALIDATION.EINSATZORT_MAX_LENGTH} Zeichen lang sein`,
  /** Soll-Stärke ist zu klein */
  SOLL_STAERKE_TOO_SMALL: `Soll-Stärke darf nicht kleiner als ${EINSATZ_EINHEIT_VALIDATION.SOLL_STAERKE_MIN} sein`,
  /** Soll-Stärke ist zu groß */
  SOLL_STAERKE_TOO_LARGE: `Soll-Stärke darf maximal ${EINSATZ_EINHEIT_VALIDATION.SOLL_STAERKE_MAX} sein`,
  /** einsatzId ist erforderlich */
  EINSATZ_ID_REQUIRED: 'einsatzId ist erforderlich',
  /** createdBy ist erforderlich */
  CREATED_BY_REQUIRED: 'createdBy ist erforderlich',
  /** Typ ist erforderlich */
  TYP_REQUIRED: 'Typ ist erforderlich',
  /** Ungültiger Typ */
  TYP_INVALID: 'Ungültiger Einheitentyp',
} as const;
