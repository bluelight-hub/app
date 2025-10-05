/**
 * Minimaler zxcvbn Score für sichere Passwörter
 *
 * Score-Skala:
 * - 0-1: Schwach
 * - 2: Mittel
 * - 3-4: Stark
 */
export const PASSWORD_MIN_SCORE = 3;

/**
 * Passwort-Kriterien für die Validierung
 */
export const PASSWORD_CRITERIA = {
  minLength: 8,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true,
} as const;

/**
 * Validiert ein Passwort anhand der definierten Kriterien (ohne zxcvbn)
 *
 * HINWEIS: Diese Funktion validiert nur die Basis-Kriterien (Länge, Zeichen).
 * Die zxcvbn-Score-Validierung erfolgt in der UI-Komponente (lazy loaded).
 *
 * @param password - Das zu validierende Passwort
 * @returns Validierungsergebnis mit isValid und optionaler Fehlermeldung
 */
export function validatePasswordCriteria(password: string): {
  isValid: boolean;
  error?: string;
} {
  // Längenprüfung
  if (password.length < PASSWORD_CRITERIA.minLength) {
    return {
      isValid: false,
      error: `Das Passwort muss mindestens ${PASSWORD_CRITERIA.minLength} Zeichen lang sein`,
    };
  }

  if (password.length > PASSWORD_CRITERIA.maxLength) {
    return {
      isValid: false,
      error: `Das Passwort darf maximal ${PASSWORD_CRITERIA.maxLength} Zeichen lang sein`,
    };
  }

  // Zeichentyp-Prüfungen
  if (PASSWORD_CRITERIA.requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Das Passwort muss mindestens einen Kleinbuchstaben enthalten',
    };
  }

  if (PASSWORD_CRITERIA.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Das Passwort muss mindestens einen Großbuchstaben enthalten',
    };
  }

  if (PASSWORD_CRITERIA.requireNumber && !/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'Das Passwort muss mindestens eine Zahl enthalten',
    };
  }

  if (PASSWORD_CRITERIA.requireSymbol && !/[^a-zA-Z0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'Das Passwort muss mindestens ein Sonderzeichen enthalten',
    };
  }

  return {
    isValid: true,
  };
}
