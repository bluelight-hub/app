/**
 * Default-Funktion für QR-Code Registrierung.
 *
 * Wird verwendet wenn Person via QR-Code erfasst wird und keine
 * spezifische Funktion bekannt ist (Story 4.2 AC3).
 */
export const DEFAULT_QR_FUNKTION = 'Helfer' as const;

/**
 * Error Codes für EinsatzPerson Domain.
 *
 * Strukturierte Fehlercodes ermöglichen:
 * - Type-safe Error Handling im Handler und Controller
 * - Konsistente Fehlermeldungen für API Responses
 * - Einfachere Fehlersuche und Logging
 *
 * Format: `EINSATZ_PERSON_{KONTEXT}_{FEHLERTYP}`
 *
 * @example
 * ```typescript
 * // Im Handler
 * if (!vorname || vorname.trim().length === 0) {
 *   return Result.fail(
 *     EinsatzPersonError.format(
 *       EINSATZ_PERSON_ERROR_CODES.VORNAME_REQUIRED,
 *       'Vorname ist erforderlich'
 *     )
 *   );
 * }
 *
 * // Im Controller (Result → HTTP)
 * if (EinsatzPersonError.hasCode(result.error, 'DUPLICATE_PERSON')) {
 *   throw new ConflictException(result.error);
 * }
 * ```
 */
export const EINSATZ_PERSON_ERROR_CODES = {
  /** Ungültige Qualifikation */
  INVALID_QUALIFIKATION: 'EINSATZ_PERSON_INVALID_QUALIFIKATION',
  /** Person mit gleichem Namen existiert bereits im Einsatz */
  DUPLICATE_PERSON: 'EINSATZ_PERSON_DUPLICATE_PERSON',
  /** Referenzierte StammPerson nicht gefunden */
  STAMM_NOT_FOUND: 'EINSATZ_PERSON_STAMM_NOT_FOUND',
  /** Referenzierte StammPerson ist archiviert */
  STAMM_ARCHIVED: 'EINSATZ_PERSON_STAMM_ARCHIVED',
  /** Ungültige Funktion */
  INVALID_FUNKTION: 'EINSATZ_PERSON_INVALID_FUNKTION',
  /** Vorname ist erforderlich */
  VORNAME_REQUIRED: 'EINSATZ_PERSON_VORNAME_REQUIRED',
  /** Nachname ist erforderlich */
  NACHNAME_REQUIRED: 'EINSATZ_PERSON_NACHNAME_REQUIRED',
  /** Funktion ist erforderlich */
  FUNKTION_REQUIRED: 'EINSATZ_PERSON_FUNKTION_REQUIRED',
  /** Referenzierter Einsatz nicht gefunden */
  EINSATZ_NOT_FOUND: 'EINSATZ_PERSON_EINSATZ_NOT_FOUND',
  /** EinsatzPerson nicht gefunden */
  NOT_FOUND: 'EINSATZ_PERSON_NOT_FOUND',
  /** Allgemeiner Validierungsfehler */
  VALIDATION_ERROR: 'EINSATZ_PERSON_VALIDATION_ERROR',
  /** Vorname zu lang */
  VORNAME_TOO_LONG: 'EINSATZ_PERSON_VORNAME_TOO_LONG',
  /** Nachname zu lang */
  NACHNAME_TOO_LONG: 'EINSATZ_PERSON_NACHNAME_TOO_LONG',
  /** Funktion zu lang */
  FUNKTION_TOO_LONG: 'EINSATZ_PERSON_FUNKTION_TOO_LONG',
  /** Funkrufname zu lang */
  FUNKRUFNAME_TOO_LONG: 'EINSATZ_PERSON_FUNKRUFNAME_TOO_LONG',
  /** StammPerson Lookup fehlgeschlagen */
  STAMM_LOOKUP_FAILED: 'EINSATZ_PERSON_STAMM_LOOKUP_FAILED',
  /** Duplikat-Check fehlgeschlagen */
  DUPLICATE_CHECK_FAILED: 'EINSATZ_PERSON_DUPLICATE_CHECK_FAILED',
  /** Speichern fehlgeschlagen */
  SAVE_FAILED: 'EINSATZ_PERSON_SAVE_FAILED',
  /** Erstellung des Aggregats fehlgeschlagen */
  AGGREGATE_CREATION_FAILED: 'EINSATZ_PERSON_AGGREGATE_CREATION_FAILED',
  /** Fahrzeug gehört zu einem anderen Einsatz */
  FAHRZEUG_NOT_IN_SAME_EINSATZ: 'EINSATZ_PERSON_FAHRZEUG_NOT_IN_SAME_EINSATZ',
  /** Fahrzeug nicht gefunden */
  FAHRZEUG_NOT_FOUND: 'EINSATZ_PERSON_FAHRZEUG_NOT_FOUND',
  /** Fahrzeug-Funkrufname ist ungültig oder fehlt */
  INVALID_FAHRZEUG_FUNKRUFNAME: 'EINSATZ_PERSON_INVALID_FAHRZEUG_FUNKRUFNAME',
} as const;

/**
 * Type für Error Codes (Union Type aus Object Values)
 */
export type EinsatzPersonErrorCode = (typeof EINSATZ_PERSON_ERROR_CODES)[keyof typeof EINSATZ_PERSON_ERROR_CODES];

/**
 * Utility Klasse für formatierte Error Messages.
 *
 * Ermöglicht strukturierte Fehlermeldungen mit extrahierbaren Error Codes.
 * Format: `[ERROR_CODE] Fehlermeldung`
 */
export class EinsatzPersonError {
  /**
   * Formatiert einen Error Code mit Nachricht.
   *
   * @param code - Error Code aus EINSATZ_PERSON_ERROR_CODES
   * @param message - Beschreibende Fehlermeldung
   * @returns Formatierter String: `[ERROR_CODE] message`
   */
  static format(code: EinsatzPersonErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert den Error Code aus einer formatierten Fehlermeldung.
   *
   * @param error - Formatierte Fehlermeldung
   * @returns Error Code oder null wenn nicht gefunden
   */
  static extractCode(error: string): EinsatzPersonErrorCode | null {
    const match = error.match(/^\[([A-Z_]+)\]/);
    if (!match) return null;

    const code = match[1] as EinsatzPersonErrorCode;
    const validCodes = Object.values(EINSATZ_PERSON_ERROR_CODES);

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
  static hasCode(error: string, code: EinsatzPersonErrorCode): boolean {
    return EinsatzPersonError.extractCode(error) === code;
  }
}
