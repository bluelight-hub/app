/**
 * Error Codes für Invite-Code Operationen.
 *
 * Diese Codes werden in HTTP Responses als 'code' Feld zurückgegeben
 * und ermöglichen eine präzise Fehlerbehandlung im Frontend.
 *
 * **Verwendung:**
 * - Command Validation: Return Result.fail(INVITE_ERROR_CODES.EXPIRY_PAST)
 * - Controller: Map Error Code zu HTTP Status + Message
 * - Frontend: i18n Mapping basierend auf Error Code
 *
 * @example
 * ```typescript
 * // In Command
 * if (props.expiresAt <= new Date()) {
 *   return Result.fail(INVITE_ERROR_CODES.EXPIRY_PAST);
 * }
 *
 * // In Controller
 * if (result.error === INVITE_ERROR_CODES.CODE_NOT_FOUND) {
 *   throw new NotFoundException('Invite code not found');
 * }
 * ```
 */
export const INVITE_ERROR_CODES = {
  /** Ablaufdatum liegt in der Vergangenheit oder zu nah (< 1 Minute) */
  EXPIRY_PAST: 'INVITE_EXPIRY_PAST',
  /** Ablaufdatum liegt zu nah in der Zukunft (< 1 Minute Minimum) */
  EXPIRY_TOO_SOON: 'INVITE_EXPIRY_TOO_SOON',
  /** maxUses außerhalb des gültigen Bereichs (1-100) */
  MAX_USES_INVALID: 'INVITE_MAX_USES_INVALID',
  /** Label zu lang (>100 Zeichen) */
  LABEL_TOO_LONG: 'INVITE_LABEL_TOO_LONG',
  /** Code ist bereits verbraucht (usedCount >= maxUses) */
  CODE_EXHAUSTED: 'INVITE_CODE_EXHAUSTED',
  /** Code ist abgelaufen (expiresAt < now) */
  CODE_EXPIRED: 'INVITE_CODE_EXPIRED',
  /** Code wurde widerrufen (isRevoked = true) */
  CODE_REVOKED: 'INVITE_CODE_REVOKED',
  /** Code nicht gefunden */
  CODE_NOT_FOUND: 'INVITE_CODE_NOT_FOUND',
  /** Code ungültig (allgemein, z.B. Format-Fehler) */
  CODE_INVALID: 'INVITE_CODE_INVALID',
  /** Aggregate-Erstellung fehlgeschlagen */
  CREATION_FAILED: 'INVITE_CREATION_FAILED',
  /** Persistierung fehlgeschlagen */
  SAVE_FAILED: 'INVITE_SAVE_FAILED',
} as const;

/**
 * Type für alle möglichen Invite Error Codes.
 * Ermöglicht Type-Safe Fehlerbehandlung im gesamten Stack.
 */
export type InviteErrorCode = (typeof INVITE_ERROR_CODES)[keyof typeof INVITE_ERROR_CODES];
