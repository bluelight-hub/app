/**
 * Validierungs-Konstanten für EinsatzPerson Domain.
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
 * if (vorname.length > EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH) {
 *   return Result.fail(EINSATZ_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG);
 * }
 *
 * // In DTO (class-validator)
 * @MaxLength(EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH, {
 *   message: EINSATZ_PERSON_VALIDATION_ERRORS.VORNAME_TOO_LONG
 * })
 * vorname: string;
 *
 * // In Prisma Schema (sync manually!)
 * vorname String @db.VarChar(100)
 * ```
 */
export const EINSATZ_PERSON_VALIDATION = {
  /** Minimale Länge für Vorname (mindestens 1 Zeichen) */
  VORNAME_MIN_LENGTH: 1,
  /** Maximale Länge für Vorname (sync mit Prisma Schema) */
  VORNAME_MAX_LENGTH: 100,
  /** Minimale Länge für Nachname (mindestens 1 Zeichen) */
  NACHNAME_MIN_LENGTH: 1,
  /** Maximale Länge für Nachname (sync mit Prisma Schema) */
  NACHNAME_MAX_LENGTH: 100,
  /** Maximale Länge für Funktion (sync mit Prisma Schema) */
  FUNKTION_MAX_LENGTH: 50,
  /** Maximale Länge für Funkrufname (sync mit Prisma Schema) */
  FUNKRUFNAME_MAX_LENGTH: 50,
} as const;

/**
 * Vordefinierte Fehlermeldungen für EinsatzPerson Validierung.
 *
 * Nutzt EINSATZ_PERSON_VALIDATION Konstanten für konsistente Error Messages.
 * Fehlermeldungen sind deutsch (Business Language).
 *
 * Format: Beschreibender Text mit konkreten Limits aus VALIDATION Konstanten
 */
export const EINSATZ_PERSON_VALIDATION_ERRORS = {
  /** Vorname darf nicht leer sein */
  VORNAME_REQUIRED: 'Vorname ist erforderlich',
  /** Vorname überschreitet maximale Länge */
  VORNAME_TOO_LONG: `Vorname darf maximal ${EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH} Zeichen lang sein`,
  /** Nachname darf nicht leer sein */
  NACHNAME_REQUIRED: 'Nachname ist erforderlich',
  /** Nachname überschreitet maximale Länge */
  NACHNAME_TOO_LONG: `Nachname darf maximal ${EINSATZ_PERSON_VALIDATION.NACHNAME_MAX_LENGTH} Zeichen lang sein`,
  /** Funktion darf nicht leer sein */
  FUNKTION_REQUIRED: 'Funktion ist erforderlich',
  /** Funktion überschreitet maximale Länge */
  FUNKTION_TOO_LONG: `Funktion darf maximal ${EINSATZ_PERSON_VALIDATION.FUNKTION_MAX_LENGTH} Zeichen lang sein`,
  /** Funkrufname überschreitet maximale Länge */
  FUNKRUFNAME_TOO_LONG: `Funkrufname darf maximal ${EINSATZ_PERSON_VALIDATION.FUNKRUFNAME_MAX_LENGTH} Zeichen lang sein`,
  /** einsatzId ist erforderlich */
  EINSATZ_ID_REQUIRED: 'einsatzId ist erforderlich',
  /** createdBy ist erforderlich */
  CREATED_BY_REQUIRED: 'createdBy ist erforderlich',
} as const;
