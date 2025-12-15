/**
 * Error Codes für Qualifikationen Domain Errors.
 *
 * Ermöglicht typsichere Fehlerbehandlung ohne brittle String-Matching.
 * Controller können auf Error Codes reagieren statt auf Fehlertexte.
 *
 * Format: ENTITY_OPERATION_REASON
 */
export const QUALIFIKATION_ERROR_CODES = {
  /** Abkürzung ist bereits vergeben (Unique Constraint Violation) */
  ABKUERZUNG_DUPLICATE: 'QUALIFIKATION_ABKUERZUNG_DUPLICATE',
  /** Qualifikation wurde nicht gefunden (Not Found) */
  NOT_FOUND: 'QUALIFIKATION_NOT_FOUND',
  /** Qualifikation ist bereits deaktiviert */
  ALREADY_DEACTIVATED: 'QUALIFIKATION_ALREADY_DEACTIVATED',
  /** Validierungsfehler in Command oder Value Object */
  VALIDATION_ERROR: 'QUALIFIKATION_VALIDATION_ERROR',
} as const;

export type QualifikationErrorCode = (typeof QUALIFIKATION_ERROR_CODES)[keyof typeof QUALIFIKATION_ERROR_CODES];

/**
 * Strukturiertes Error-Format für Result Pattern.
 *
 * Kombiniert Error Code mit menschenlesbarer Nachricht.
 * Controller können Code extrahieren, um HTTP Status zu bestimmen.
 *
 * @example
 * const error = QualifikationError.format(
 *   QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE,
 *   'Die Abkürzung "AGT" ist bereits vergeben.'
 * );
 * // => "[QUALIFIKATION_ABKUERZUNG_DUPLICATE] Die Abkürzung "AGT" ist bereits vergeben."
 */
export class QualifikationError {
  /**
   * Formatiert Error Code + Message zu strukturiertem String.
   * @param code - Error Code (aus QUALIFIKATION_ERROR_CODES)
   * @param message - Menschenlesbare Fehlermeldung
   */
  static format(code: QualifikationErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert Error Code aus formatiertem Error String.
   * @param error - Formatierter Error String (oder plain String)
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): QualifikationErrorCode | null {
    const match = error.match(/^\[([^\]]+)\]/);
    if (!match) return null;
    const code = match[1];
    // Type Guard: Prüfe ob Code zu QUALIFIKATION_ERROR_CODES gehört
    return Object.values(QUALIFIKATION_ERROR_CODES).includes(code as QualifikationErrorCode) ? (code as QualifikationErrorCode) : null;
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
  static hasCode(error: string, code: QualifikationErrorCode): boolean {
    return QualifikationError.extractCode(error) === code;
  }
}
