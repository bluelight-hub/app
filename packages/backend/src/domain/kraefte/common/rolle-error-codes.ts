/**
 * Fehlercodes für RollenDefinition Domain-Operationen.
 *
 * Zentralisierte Error Codes ermöglichen:
 * - Controller-seitige HTTP-Status-Zuordnung (400/404/409)
 * - Konsistente Fehlermeldungen über alle Layer
 * - Testbarkeit der Fehlerbehandlung
 */
export const ROLLE_ERROR_CODES = {
  /** Name bereits vergeben (HTTP 409 Conflict) */
  NAME_DUPLICATE: 'ROLLE_NAME_DUPLICATE',
  /** Rolle nicht gefunden (HTTP 404 Not Found) */
  NOT_FOUND: 'ROLLE_NOT_FOUND',
  /** Rolle bereits deaktiviert (HTTP 400 Bad Request) */
  ALREADY_DEACTIVATED: 'ROLLE_ALREADY_DEACTIVATED',
  /** Validierungsfehler (HTTP 400 Bad Request) */
  VALIDATION_ERROR: 'ROLLE_VALIDATION_ERROR',
  /** Qualifikation nicht gefunden (HTTP 400 Bad Request) */
  QUALIFIKATION_NOT_FOUND: 'ROLLE_QUALIFIKATION_NOT_FOUND',
} as const;

export type RolleErrorCode = (typeof ROLLE_ERROR_CODES)[keyof typeof ROLLE_ERROR_CODES];

/**
 * Utility-Klasse für strukturierte Fehlerformatierung.
 *
 * Ermöglicht konsistente Fehlerbehandlung durch formatierte Fehlermeldungen
 * mit extrahierbaren Error Codes für Controller-seitige Zuordnung.
 */
export class RolleError {
  /**
   * Formatiert Fehlermeldung mit Error Code Prefix.
   * @example RolleError.format(ROLLE_ERROR_CODES.NAME_DUPLICATE, "Name 'EL' vergeben")
   *          => "[ROLLE_NAME_DUPLICATE] Name 'EL' vergeben"
   */
  static format(code: RolleErrorCode, message: string): string {
    return `[${code}] ${message}`;
  }

  /**
   * Extrahiert Error Code aus formatierter Fehlermeldung.
   */
  static extractCode(error: string): RolleErrorCode | null {
    const match = error.match(/^\[([A-Z_]+)\]/);
    if (!match) return null;
    const code = match[1];
    return Object.values(ROLLE_ERROR_CODES).includes(code as RolleErrorCode) ? (code as RolleErrorCode) : null;
  }

  /**
   * Extrahiert Nachricht ohne Error Code Prefix.
   */
  static extractMessage(error: string): string {
    return error.replace(/^\[[A-Z_]+\]\s*/, '');
  }

  /**
   * Prüft ob Fehlermeldung einen bestimmten Error Code enthält.
   */
  static hasCode(error: string, code: RolleErrorCode): boolean {
    return RolleError.extractCode(error) === code;
  }
}
