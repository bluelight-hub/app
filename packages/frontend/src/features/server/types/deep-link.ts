/**
 * Deep Link Integration Types
 *
 * Definiert die Typen für Deep Link Parameter Handling.
 * Deep Links folgen dem Schema: bluelight://connect?url=...&invite=...&expires=...
 */

/**
 * Parsed Deep Link Parameter
 *
 * @property serverUrl - Base URL des Backend Servers (z.B. https://api.example.de)
 * @property inviteCode - Invite Code für Server-Zugang (z.B. INV_12345678)
 * @property expiresAt - ISO 8601 Timestamp für Link-Ablauf (z.B. 2025-01-10T12:00:00Z)
 */
export interface DeepLinkParams {
  serverUrl: string | null;
  inviteCode: string | null;
  expiresAt: string | null;
}

/**
 * Deep Link Event Types
 */
export type DeepLinkEvent = 'deep-link-received' | 'deep-link-error';

/**
 * Deep Link Error Types
 */
export enum DeepLinkError {
  INVALID_PROTOCOL = 'INVALID_PROTOCOL',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  EXPIRED_LINK = 'EXPIRED_LINK',
  PARSE_ERROR = 'PARSE_ERROR',
}
