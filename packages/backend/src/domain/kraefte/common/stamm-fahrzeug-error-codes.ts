/**
 * Error Codes für StammFahrzeug Domain Errors.
 *
 * Ermöglicht typsichere Fehlerbehandlung ohne brittle String-Matching.
 * Controller können auf Error Codes reagieren statt auf Fehlertexte.
 *
 * Format: ENTITY_OPERATION_REASON
 */
export const STAMM_FAHRZEUG_ERROR_CODES = {
  /** StammFahrzeug wurde nicht gefunden (Not Found) */
  NOT_FOUND: 'STAMM_FAHRZEUG_NOT_FOUND',
  /** Funkrufname ist bereits vergeben (Unique Constraint Violation) */
  FUNKRUFNAME_DUPLICATE: 'STAMM_FAHRZEUG_FUNKRUFNAME_DUPLICATE',
  /** StammFahrzeug ist bereits archiviert */
  ALREADY_ARCHIVED: 'STAMM_FAHRZEUG_ALREADY_ARCHIVED',
  /** Fahrzeugtyp existiert nicht oder ist ungültig */
  INVALID_FAHRZEUGTYP: 'STAMM_FAHRZEUG_INVALID_FAHRZEUGTYP',
  /** Fahrzeugtyp kann nach Erstellung nicht geändert werden (Immutability) */
  FAHRZEUGTYP_IMMUTABLE: 'STAMM_FAHRZEUG_FAHRZEUGTYP_IMMUTABLE',
  /** Validierungsfehler in Command oder Value Object */
  VALIDATION_ERROR: 'STAMM_FAHRZEUG_VALIDATION_ERROR',
} as const;

export type StammFahrzeugErrorCode = (typeof STAMM_FAHRZEUG_ERROR_CODES)[keyof typeof STAMM_FAHRZEUG_ERROR_CODES];

/**
 * Strukturiertes Error-Format für Result Pattern.
 *
 * Kombiniert Error Code mit menschenlesbarer Nachricht.
 * Controller können Code extrahieren, um HTTP Status zu bestimmen.
 *
 * @example
 * const error = StammFahrzeugError.format(
 *   STAMM_FAHRZEUG_ERROR_CODES.FUNKRUFNAME_DUPLICATE,
 *   'Der Funkrufname "Florian 1/46/1" ist bereits vergeben.'
 * );
 * // => "[STAMM_FAHRZEUG_FUNKRUFNAME_DUPLICATE] Der Funkrufname "Florian 1/46/1" ist bereits vergeben."
 */
export class StammFahrzeugError {
  /**
   * Formatiert Error Code + Message zu strukturiertem String.
   * @param code - Error Code (aus STAMM_FAHRZEUG_ERROR_CODES)
   * @param message - Menschenlesbare Fehlermeldung
   */
  static format(code: StammFahrzeugErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert Error Code aus formatiertem Error String.
   * @param error - Formatierter Error String (oder plain String)
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): StammFahrzeugErrorCode | null {
    const match = error.match(/^\[([^\]]+)\]/);
    if (!match) return null;
    const code = match[1];
    // Type Guard: Prüfe ob Code zu STAMM_FAHRZEUG_ERROR_CODES gehört
    return Object.values(STAMM_FAHRZEUG_ERROR_CODES).includes(code as StammFahrzeugErrorCode) ? (code as StammFahrzeugErrorCode) : null;
  }

  /**
   * Extrahiert plain Message ohne Error Code.
   * @param error - Formatierter Error String
   * @returns Message ohne [CODE] Prefix
   */
  static extractMessage(error: string): string {
    return error.replace(/^\[[^\]]+\]\s*/, '');
  }

  /**
   * Prüft ob ein Error einen bestimmten Code hat.
   * @param error - Formatierter Error String
   * @param code - Zu prüfender Error Code
   */
  static hasCode(error: string, code: StammFahrzeugErrorCode): boolean {
    return StammFahrzeugError.extractCode(error) === code;
  }
}
