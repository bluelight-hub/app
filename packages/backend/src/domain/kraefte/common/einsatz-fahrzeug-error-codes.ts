/**
 * Error Codes für EinsatzFahrzeug Domain.
 *
 * Strukturierte Fehlercodes ermöglichen:
 * - Type-safe Error Handling im Handler und Controller
 * - Konsistente Fehlermeldungen für API Responses
 * - Einfachere Fehlersuche und Logging
 *
 * Format: `EINSATZ_FAHRZEUG_{KONTEXT}_{FEHLERTYP}`
 *
 * @example
 * ```typescript
 * // Im Handler
 * if (fmsStatus < 0 || fmsStatus > 9) {
 *   return Result.fail(
 *     EinsatzFahrzeugError.format(
 *       EINSATZ_FAHRZEUG_ERROR_CODES.INVALID_FMS_STATUS,
 *       `FMS-Status muss zwischen 0 und 9 liegen, erhalten: ${fmsStatus}`
 *     )
 *   );
 * }
 *
 * // Im Controller (Result → HTTP)
 * if (EinsatzFahrzeugError.hasCode(result.error, 'FUNKRUFNAME_DUPLICATE')) {
 *   throw new ConflictException(result.error);
 * }
 * ```
 */
export const EINSATZ_FAHRZEUG_ERROR_CODES = {
  /** FMS-Status außerhalb des gültigen Bereichs (0-9) */
  INVALID_FMS_STATUS: 'EINSATZ_FAHRZEUG_INVALID_FMS_STATUS',
  /** Fahrzeug mit gleichem Funkrufnamen existiert bereits im Einsatz */
  FUNKRUFNAME_DUPLICATE: 'EINSATZ_FAHRZEUG_FUNKRUFNAME_DUPLICATE',
  /** Referenziertes StammFahrzeug nicht gefunden */
  STAMM_NOT_FOUND: 'EINSATZ_FAHRZEUG_STAMM_NOT_FOUND',
  /** Referenzierter Einsatz nicht gefunden */
  EINSATZ_NOT_FOUND: 'EINSATZ_FAHRZEUG_EINSATZ_NOT_FOUND',
  /** Referenzierter Fahrzeugtyp nicht gefunden */
  FAHRZEUGTYP_NOT_FOUND: 'EINSATZ_FAHRZEUG_FAHRZEUGTYP_NOT_FOUND',
  /** Referenzierter Fahrzeugtyp ist inaktiv */
  FAHRZEUGTYP_INACTIVE: 'EINSATZ_FAHRZEUG_FAHRZEUGTYP_INACTIVE',
  /** EinsatzFahrzeug nicht gefunden */
  NOT_FOUND: 'EINSATZ_FAHRZEUG_NOT_FOUND',
  /** Allgemeiner Validierungsfehler */
  VALIDATION_ERROR: 'EINSATZ_FAHRZEUG_VALIDATION_ERROR',
  /** Ungültige Position (Koordinaten außerhalb WGS84 Bereich) */
  INVALID_POSITION: 'EINSATZ_FAHRZEUG_INVALID_POSITION',
} as const;

/**
 * Type für Error Codes (Union Type aus Object Values)
 */
export type EinsatzFahrzeugErrorCode = (typeof EINSATZ_FAHRZEUG_ERROR_CODES)[keyof typeof EINSATZ_FAHRZEUG_ERROR_CODES];

/**
 * Utility Klasse für formatierte Error Messages.
 *
 * Ermöglicht strukturierte Fehlermeldungen mit extrahierbaren Error Codes.
 * Format: `[ERROR_CODE] Fehlermeldung`
 */
export class EinsatzFahrzeugError {
  /**
   * Formatiert einen Error Code mit Nachricht.
   *
   * @param code - Error Code aus EINSATZ_FAHRZEUG_ERROR_CODES
   * @param message - Beschreibende Fehlermeldung
   * @returns Formatierter String: `[ERROR_CODE] message`
   */
  static format(code: EinsatzFahrzeugErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert den Error Code aus einer formatierten Fehlermeldung.
   *
   * @param error - Formatierte Fehlermeldung
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): EinsatzFahrzeugErrorCode | null {
    const match = error.match(/^\[([A-Z_]+)\]/);
    if (!match) return null;

    const code = match[1] as EinsatzFahrzeugErrorCode;
    const validCodes = Object.values(EINSATZ_FAHRZEUG_ERROR_CODES);

    return validCodes.includes(code) ? code : null;
  }

  /**
   * Extrahiert die Nachricht aus einer formatierten Fehlermeldung.
   *
   * @param error - Formatierte Fehlermeldung
   * @returns Nachricht ohne Code-Prefix
   */
  static extractMessage(error: string): string {
    return error.replace(/^\[[A-Z_]+\]\s*/, '');
  }

  /**
   * Prüft ob eine Fehlermeldung einen bestimmten Error Code enthält.
   *
   * @param error - Formatierte Fehlermeldung
   * @param code - Zu prüfender Error Code
   * @returns true wenn Code übereinstimmt
   */
  static hasCode(error: string, code: EinsatzFahrzeugErrorCode): boolean {
    return EinsatzFahrzeugError.extractCode(error) === code;
  }
}
