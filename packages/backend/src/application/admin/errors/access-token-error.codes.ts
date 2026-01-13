/**
 * Error Codes fuer Access-Token Operationen.
 *
 * Diese Codes werden in HTTP Responses als 'code' Feld zurueckgegeben
 * und ermoeglichen eine praezise Fehlerbehandlung im Frontend.
 *
 * **Verwendung:**
 * - Command Validation: Return Result.fail(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT)
 * - Controller: Map Error Code zu HTTP Status + Message
 * - Frontend: i18n Mapping basierend auf Error Code
 *
 * @example
 * ```typescript
 * // In Command
 * if (props.name.length < 3) {
 *   return Result.fail(ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT);
 * }
 *
 * // In Controller
 * if (result.error === ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND) {
 *   throw new NotFoundException('Access token not found');
 * }
 * ```
 */
export const ACCESS_TOKEN_ERROR_CODES = {
  /** Name ist zu kurz (< 3 Zeichen) */
  NAME_TOO_SHORT: 'ACCESS_TOKEN_NAME_TOO_SHORT',
  /** Name ist zu lang (> 50 Zeichen) */
  NAME_TOO_LONG: 'ACCESS_TOKEN_NAME_TOO_LONG',
  /** Name ist leer oder nur Whitespace */
  NAME_EMPTY: 'ACCESS_TOKEN_NAME_EMPTY',
  /** Token nicht gefunden */
  TOKEN_NOT_FOUND: 'ACCESS_TOKEN_NOT_FOUND',
  /** Token ist widerrufen */
  TOKEN_REVOKED: 'ACCESS_TOKEN_REVOKED',
  /** Token ist abgelaufen */
  TOKEN_EXPIRED: 'ACCESS_TOKEN_EXPIRED',
  /** Aggregate-Erstellung fehlgeschlagen */
  CREATION_FAILED: 'ACCESS_TOKEN_CREATION_FAILED',
  /** Persistierung fehlgeschlagen */
  SAVE_FAILED: 'ACCESS_TOKEN_SAVE_FAILED',
  /** Token-Hash-Erstellung fehlgeschlagen */
  TOKEN_HASH_FAILED: 'ACCESS_TOKEN_HASH_FAILED',
  /** Ungueltige User-ID */
  INVALID_USER_ID: 'ACCESS_TOKEN_INVALID_USER_ID',
  /** Token kann nicht rotiert werden (revoked oder expired) */
  NOT_ROTATABLE: 'ACCESS_TOKEN_NOT_ROTATABLE',
  /** Ungueltige Token-ID */
  INVALID_TOKEN_ID: 'ACCESS_TOKEN_INVALID_TOKEN_ID',
} as const;

/**
 * Type fuer alle moeglichen Access-Token Error Codes.
 * Ermoeglicht Type-Safe Fehlerbehandlung im gesamten Stack.
 */
export type AccessTokenErrorCode = (typeof ACCESS_TOKEN_ERROR_CODES)[keyof typeof ACCESS_TOKEN_ERROR_CODES];
