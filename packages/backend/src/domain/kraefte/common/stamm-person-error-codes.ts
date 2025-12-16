/**
 * Error Codes für StammPerson Domain Errors.
 *
 * Ermöglicht typsichere Fehlerbehandlung ohne brittle String-Matching.
 * Controller können auf Error Codes reagieren statt auf Fehlertexte.
 *
 * Format: ENTITY_OPERATION_REASON
 */
export const STAMM_PERSON_ERROR_CODES = {
  /** StammPerson wurde nicht gefunden (Not Found) */
  NOT_FOUND: 'STAMM_PERSON_NOT_FOUND',
  /** Personalnummer ist bereits vergeben (Unique Constraint Violation) */
  PERSONALNUMMER_DUPLICATE: 'STAMM_PERSON_PERSONALNUMMER_DUPLICATE',
  /** StammPerson ist bereits archiviert */
  ALREADY_ARCHIVED: 'STAMM_PERSON_ALREADY_ARCHIVED',
  /** StammPerson ist nicht archiviert (kann nicht reaktiviert werden) */
  NOT_ARCHIVED: 'STAMM_PERSON_NOT_ARCHIVED',
  /** Änderung an archivierter Person nicht erlaubt */
  ARCHIVED_PERSON_MODIFICATION: 'STAMM_PERSON_ARCHIVED_MODIFICATION',
  /** Qualifikation ist ungültig oder existiert nicht */
  INVALID_QUALIFIKATION: 'STAMM_PERSON_INVALID_QUALIFIKATION',
  /** Qualifikation wurde nicht gefunden */
  QUALIFIKATION_NOT_FOUND: 'STAMM_PERSON_QUALIFIKATION_NOT_FOUND',
  /** Validierungsfehler in Command oder Value Object */
  VALIDATION_ERROR: 'STAMM_PERSON_VALIDATION_ERROR',
} as const;

export type StammPersonErrorCode = (typeof STAMM_PERSON_ERROR_CODES)[keyof typeof STAMM_PERSON_ERROR_CODES];

/**
 * Strukturiertes Error-Format für Result Pattern.
 *
 * Kombiniert Error Code mit menschenlesbarer Nachricht.
 * Controller können Code extrahieren, um HTTP Status zu bestimmen.
 *
 * @example
 * const error = StammPersonError.format(
 *   STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE,
 *   'Die Personalnummer "12345" ist bereits vergeben.'
 * );
 * // => "[STAMM_PERSON_PERSONALNUMMER_DUPLICATE] Die Personalnummer "12345" ist bereits vergeben."
 */
export class StammPersonError {
  /**
   * Formatiert Error Code + Message zu strukturiertem String.
   * @param code - Error Code (aus STAMM_PERSON_ERROR_CODES)
   * @param message - Menschenlesbare Fehlermeldung
   */
  static format(code: StammPersonErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert Error Code aus formatiertem Error String.
   * @param error - Formatierter Error String (oder plain String)
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): StammPersonErrorCode | null {
    const match = error.match(/^\[([^\]]+)\]/);
    if (!match) return null;
    const code = match[1];
    // Type Guard: Prüfe ob Code zu STAMM_PERSON_ERROR_CODES gehört
    return Object.values(STAMM_PERSON_ERROR_CODES).includes(code as StammPersonErrorCode) ? (code as StammPersonErrorCode) : null;
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
  static hasCode(error: string, code: StammPersonErrorCode): boolean {
    return StammPersonError.extractCode(error) === code;
  }
}
