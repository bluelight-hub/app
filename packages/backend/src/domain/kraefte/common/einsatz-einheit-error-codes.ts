/**
 * Error Codes für EinsatzEinheit Domain.
 *
 * Strukturierte Fehlercodes ermöglichen:
 * - Type-safe Error Handling im Handler und Controller
 * - Konsistente Fehlermeldungen für API Responses
 * - Einfachere Fehlersuche und Logging
 *
 * Format: `EINSATZ_EINHEIT_{KONTEXT}_{FEHLERTYP}`
 *
 * @example
 * ```typescript
 * // Im Handler
 * if (!einheit) {
 *   return Result.fail(
 *     EinsatzEinheitError.format(
 *       EINSATZ_EINHEIT_ERROR_CODES.NOT_FOUND,
 *       'Einheit nicht gefunden'
 *     )
 *   );
 * }
 *
 * // Im Controller (Result → HTTP)
 * if (EinsatzEinheitError.hasCode(result.error, 'NOT_FOUND')) {
 *   throw new NotFoundException(result.error);
 * }
 * ```
 */
export const EINSATZ_EINHEIT_ERROR_CODES = {
  /** EinsatzEinheit nicht gefunden */
  NOT_FOUND: 'EINSATZ_EINHEIT_NOT_FOUND',
  /** Allgemeiner Validierungsfehler */
  VALIDATION_ERROR: 'EINSATZ_EINHEIT_VALIDATION_ERROR',
  /** Einheit mit gleichem Namen existiert bereits im Einsatz */
  DUPLICATE_NAME: 'EINSATZ_EINHEIT_DUPLICATE_NAME',
  /** Einheit hat untergeordnete Einheiten (kann nicht gelöscht werden) */
  HAS_CHILDREN: 'EINSATZ_EINHEIT_HAS_CHILDREN',
  /** Einheit hat zugewiesene Personen (kann nicht gelöscht werden) */
  HAS_PERSONEN: 'EINSATZ_EINHEIT_HAS_PERSONEN',
  /** Zirkuläre Hierarchie erkannt (Einheit kann nicht eigener Vorfahre sein) */
  CIRCULAR_HIERARCHY: 'EINSATZ_EINHEIT_CIRCULAR_HIERARCHY',
  /** Referenzierte Person nicht gefunden */
  PERSON_NOT_FOUND: 'EINSATZ_EINHEIT_PERSON_NOT_FOUND',
  /** Person ist bereits dieser Einheit zugewiesen */
  PERSON_ALREADY_ASSIGNED: 'EINSATZ_EINHEIT_PERSON_ALREADY_ASSIGNED',
  /** Referenzierte Einheit nicht gefunden */
  EINHEIT_NOT_FOUND: 'EINSATZ_EINHEIT_EINHEIT_NOT_FOUND',
  /** Referenzierter Einheitenführer nicht gefunden */
  FUEHRER_NOT_FOUND: 'EINSATZ_EINHEIT_FUEHRER_NOT_FOUND',
} as const;

/**
 * Type für Error Codes (Union Type aus Object Values)
 */
export type EinsatzEinheitErrorCode = (typeof EINSATZ_EINHEIT_ERROR_CODES)[keyof typeof EINSATZ_EINHEIT_ERROR_CODES];

/**
 * Utility Klasse für formatierte Error Messages.
 *
 * Ermöglicht strukturierte Fehlermeldungen mit extrahierbaren Error Codes.
 * Format: `[ERROR_CODE] Fehlermeldung`
 */
export class EinsatzEinheitError {
  /**
   * Formatiert einen Error Code mit Nachricht.
   *
   * @param code - Error Code aus EINSATZ_EINHEIT_ERROR_CODES
   * @param message - Beschreibende Fehlermeldung
   * @returns Formatierter String: `[ERROR_CODE] message`
   */
  static format(code: EinsatzEinheitErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert den Error Code aus einer formatierten Fehlermeldung.
   *
   * @param error - Formatierte Fehlermeldung
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): EinsatzEinheitErrorCode | null {
    const match = error.match(/^\[([A-Z_]+)\]/);
    if (!match) return null;

    const code = match[1] as EinsatzEinheitErrorCode;
    const validCodes = Object.values(EINSATZ_EINHEIT_ERROR_CODES);

    return validCodes.includes(code) ? code : null;
  }

  /**
   * Extrahiert die Nachricht aus einer formatierten Fehlermeldung.
   *
   * @param error - Formatierte Fehlermeldung
   * @returns Nachricht ohne Code-Prefix
   */
  static extractMessage(error: string): string {
    return error.replace(/^\[[A-Z_]+]\s*/, '');
  }

  /**
   * Prüft ob eine Fehlermeldung einen bestimmten Error Code enthält.
   *
   * @param error - Formatierte Fehlermeldung
   * @param code - Zu prüfender Error Code
   * @returns true wenn Code übereinstimmt
   */
  static hasCode(error: string, code: EinsatzEinheitErrorCode): boolean {
    return EinsatzEinheitError.extractCode(error) === code;
  }
}
