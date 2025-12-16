/**
 * Error Codes für Fahrzeugtypen Domain Errors.
 *
 * Ermöglicht typsichere Fehlerbehandlung ohne brittle String-Matching.
 * Controller können auf Error Codes reagieren statt auf Fehlertexte.
 *
 * Format: ENTITY_OPERATION_REASON
 */
export const FAHRZEUGTYP_ERROR_CODES = {
  /** Code ist bereits vergeben (Unique Constraint Violation) */
  CODE_DUPLICATE: 'FAHRZEUGTYP_CODE_DUPLICATE',
  /** Fahrzeugtyp wurde nicht gefunden (Not Found) */
  NOT_FOUND: 'FAHRZEUGTYP_NOT_FOUND',
  /** Fahrzeugtyp ist bereits deaktiviert */
  ALREADY_DEACTIVATED: 'FAHRZEUGTYP_ALREADY_DEACTIVATED',
  /** Validierungsfehler in Command oder Value Object */
  VALIDATION_ERROR: 'FAHRZEUGTYP_VALIDATION_ERROR',
} as const;

export type FahrzeugtypErrorCode = (typeof FAHRZEUGTYP_ERROR_CODES)[keyof typeof FAHRZEUGTYP_ERROR_CODES];

/**
 * Strukturiertes Error-Format für Result Pattern.
 *
 * Kombiniert Error Code mit menschenlesbarer Nachricht.
 * Controller können Code extrahieren, um HTTP Status zu bestimmen.
 *
 * @example
 * const error = FahrzeugtypError.format(
 *   FAHRZEUGTYP_ERROR_CODES.CODE_DUPLICATE,
 *   'Der Code "HLF" ist bereits vergeben.'
 * );
 * // => "[FAHRZEUGTYP_CODE_DUPLICATE] Der Code "HLF" ist bereits vergeben."
 */
export class FahrzeugtypError {
  /**
   * Formatiert Error Code + Message zu strukturiertem String.
   * @param code - Error Code (aus FAHRZEUGTYP_ERROR_CODES)
   * @param message - Menschenlesbare Fehlermeldung
   */
  static format(code: FahrzeugtypErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert Error Code aus formatiertem Error String.
   * @param error - Formatierter Error String (oder plain String)
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): FahrzeugtypErrorCode | null {
    const match = error.match(/^\[([^\]]+)\]/);
    if (!match) return null;
    const code = match[1];
    // Type Guard: Prüfe ob Code zu FAHRZEUGTYP_ERROR_CODES gehört
    return Object.values(FAHRZEUGTYP_ERROR_CODES).includes(code as FahrzeugtypErrorCode) ? (code as FahrzeugtypErrorCode) : null;
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
  static hasCode(error: string, code: FahrzeugtypErrorCode): boolean {
    return FahrzeugtypError.extractCode(error) === code;
  }
}
