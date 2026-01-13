/**
 * Error Codes fuer Security-bezogene Operationen.
 *
 * Diese Codes werden in HTTP Responses als 'code' Feld zurueckgegeben
 * und ermoeglichen eine praezise Fehlerbehandlung im Frontend.
 *
 * **Verwendung:**
 * - Command Validation: Return Result.fail(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE)
 * - Controller: Map Error Code zu HTTP Status + Message
 * - Frontend: i18n Mapping basierend auf Error Code
 *
 * @example
 * ```typescript
 * // In Handler
 * if (!config.insecureMode) {
 *   return Result.fail(SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE);
 * }
 *
 * // In Controller
 * if (result.error === SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE) {
 *   throw new ConflictException('Server is already in secure mode');
 * }
 * ```
 */
export const SECURITY_ERROR_CODES = {
  /** Server ist bereits im SECURE Mode (Migration nicht moeglich) */
  ALREADY_IN_SECURE_MODE: 'SECURITY_ALREADY_IN_SECURE_MODE',
  /** Migration zu SECURE Mode fehlgeschlagen */
  MIGRATION_FAILED: 'SECURITY_MIGRATION_FAILED',
  /** Token-Generierung waehrend Migration fehlgeschlagen */
  TOKEN_GENERATION_FAILED: 'SECURITY_TOKEN_GENERATION_FAILED',
  /** Token-Name ist ungueltig (zu kurz, zu lang, leer) */
  INVALID_TOKEN_NAME: 'SECURITY_INVALID_TOKEN_NAME',
  /** Server-Konfiguration nicht gefunden */
  CONFIG_NOT_FOUND: 'SECURITY_CONFIG_NOT_FOUND',
  /** Server-Konfiguration konnte nicht aktualisiert werden */
  CONFIG_UPDATE_FAILED: 'SECURITY_CONFIG_UPDATE_FAILED',
  /** Konfiguration ist unerwartet null */
  CONFIG_NULL: 'SECURITY_CONFIG_NULL',
  /** Token-Zaehlung fehlgeschlagen */
  TOKEN_COUNT_FAILED: 'SECURITY_TOKEN_COUNT_FAILED',
  /** Unerwarteter Fehler beim Abrufen des Security-Status */
  STATUS_QUERY_FAILED: 'SECURITY_STATUS_QUERY_FAILED',
} as const;

/**
 * Type fuer alle moeglichen Security Error Codes.
 * Ermoeglicht Type-Safe Fehlerbehandlung im gesamten Stack.
 */
export type SecurityErrorCode = (typeof SECURITY_ERROR_CODES)[keyof typeof SECURITY_ERROR_CODES];
