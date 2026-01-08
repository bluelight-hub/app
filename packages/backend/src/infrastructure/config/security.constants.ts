/**
 * Security-Konstanten für Authentifizierung und Hashing.
 *
 * Diese Datei definiert kryptographische Parameter
 * als TypeScript Literal Types für Compile-Time Type-Safety.
 * Alle Werte erfüllen NFR-S1 (Security Requirements).
 */

/**
 * Valide bcrypt Cost Factors gemäß NFR-S1.
 *
 * Bereich: 10-14 (höhere Werte = längere Hashing-Dauer, mehr Sicherheit)
 * Empfehlung: 10-12 für Production
 *
 * Warum 10 Minimum?
 * - Cost Factor 10 = ~10ms auf modernem System
 * - Cost Factor 14 = ~100ms (zu langsam für Benutzer-Logins)
 * - Cost Factor 8-9 = veraltet (nicht mehr sicher gegen Brute-Force)
 *
 * Referenzen:
 * - OWASP Password Hashing Guidelines
 * - bcrypt Dokumentation (mindestens $2a$10$)
 */
export type ValidBcryptCostFactor = 10 | 11 | 12 | 13 | 14;

/**
 * Standard bcrypt Cost Factor für allgemeine Passwort-Hashes.
 * Erfüllt NFR-S1 Mindestanforderung (>= 10).
 */
export const BCRYPT_COST_FACTOR_PASSWORD = 10 as const satisfies ValidBcryptCostFactor;

/**
 * bcrypt Cost Factor für Token-Hashes (Server Access Tokens).
 * Gleicher Wert wie Passwort-Hashes für Konsistenz.
 */
export const BCRYPT_COST_FACTOR_TOKEN = 10 as const satisfies ValidBcryptCostFactor;

/**
 * Validiert einen bcrypt Cost Factor zur Laufzeit.
 *
 * **Verwendung:**
 * ```typescript
 * const userInput = 10;
 * const result = validateBcryptCostFactor(userInput);
 * if (result.isValid) {
 *   // userInput ist vom Typ ValidBcryptCostFactor
 *   await bcrypt.hash(password, result.value);
 * }
 * ```
 *
 * @param value - Der zu validierende Wert
 * @returns Objekt mit isValid Flag und validiertem Wert oder Fallback
 */
export function validateBcryptCostFactor(value: unknown): {
  isValid: boolean;
  value: ValidBcryptCostFactor;
  error?: string;
} {
  // Type checking first: string or number only
  if (typeof value !== 'string' && typeof value !== 'number') {
    return {
      isValid: false,
      value: BCRYPT_COST_FACTOR_PASSWORD,
      error: 'bcrypt Cost Factor muss eine Zahl sein',
    };
  }

  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);

  if (Number.isNaN(parsed)) {
    return {
      isValid: false,
      value: BCRYPT_COST_FACTOR_PASSWORD,
      error: 'bcrypt Cost Factor muss eine Zahl sein',
    };
  }

  // Check for integer (no floating point allowed)
  if (!Number.isInteger(parsed)) {
    return {
      isValid: false,
      value: BCRYPT_COST_FACTOR_PASSWORD,
      error: 'bcrypt Cost Factor muss eine ganze Zahl sein (keine Dezimalzahl)',
    };
  }

  if (parsed < 10 || parsed > 14) {
    return {
      isValid: false,
      value: BCRYPT_COST_FACTOR_PASSWORD,
      error: `bcrypt Cost Factor muss zwischen 10 und 14 liegen (ist: ${parsed})`,
    };
  }

  return {
    isValid: true,
    value: parsed as ValidBcryptCostFactor,
  };
}

/**
 * Type Guard: Prüft ob ein Wert ein ValidBcryptCostFactor ist.
 *
 * **Verwendung in Type-Narrowing:**
 * ```typescript
 * const value: number = 10;
 * if (isBcryptCostFactor(value)) {
 *   // TypeScript kennt jetzt: value: ValidBcryptCostFactor
 *   await bcrypt.hash(password, value);
 * }
 * ```
 *
 * @param value - Der zu prüfende Wert
 * @returns true wenn value eine ValidBcryptCostFactor ist
 */
export function isBcryptCostFactor(value: unknown): value is ValidBcryptCostFactor {
  return typeof value === 'number' && value >= 10 && value <= 14 && Number.isInteger(value);
}
