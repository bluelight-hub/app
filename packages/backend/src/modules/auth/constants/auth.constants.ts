/**
 * Konstanten für das Authentifizierungssystem.
 * Zentrale Verwaltung aller sicherheitsrelevanten Konfigurationswerte.
 */

/**
 * Token-bezogene Konstanten
 */
export const TOKEN_CONFIG = {
  /**
   * Access Token Ablaufzeit in Sekunden (15 Minuten)
   */
  ACCESS_TOKEN_EXPIRY_SECONDS: 15 * 60, // 900 seconds

  /**
   * Refresh Token Ablaufzeit in Sekunden (7 Tage)
   */
  REFRESH_TOKEN_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 604800 seconds

  /**
   * Refresh Token Ablaufzeit als String für JWT-Bibliothek
   */
  REFRESH_TOKEN_EXPIRY_STRING: '7d',
} as const;

/**
 * Login-Sicherheitskonstanten
 */
export const LOGIN_SECURITY = {
  /**
   * Maximale Anzahl fehlgeschlagener Login-Versuche bevor Account gesperrt wird
   */
  MAX_FAILED_ATTEMPTS: 5,

  /**
   * Sperrzeit in Millisekunden nach überschreiten der maximalen Fehlversuche (30 Minuten)
   */
  LOCKOUT_DURATION_MS: 30 * 60 * 1000,

  /**
   * Maximale Anzahl aktiver Sessions pro Benutzer
   */
  MAX_SESSIONS_PER_USER: 5,

  /**
   * Zeit in Millisekunden, nach der alte Sessions automatisch bereinigt werden (30 Tage)
   */
  SESSION_CLEANUP_AGE_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Session-bezogene Konstanten
 */
export const SESSION_CONFIG = {
  /**
   * Intervall für Session-Cleanup in Millisekunden (täglich)
   */
  CLEANUP_INTERVAL_MS: 24 * 60 * 60 * 1000,

  /**
   * Maximale Anzahl von Refresh-Token-Verwendungen pro Stunde
   */
  MAX_REFRESH_ATTEMPTS_PER_HOUR: 10,
} as const;

/**
 * Sicherheits-Event-Typen für Logging
 *
 * Definiert alle sicherheitsrelevanten Ereignisse, die im System
 * protokolliert werden sollen, wie Login-Versuche, Token-Operationen
 * und verdächtige Aktivitäten.
 *
 * @enum {string}
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_ACTIVITY = 'SESSION_ACTIVITY',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Error-Codes für Authentifizierungsfehler
 *
 * Standardisierte Fehlercodes für alle authentifizierungsbezogenen
 * Fehler im System. Diese Codes werden in Exceptions und Fehlermeldungen
 * verwendet, um eine einheitliche Fehlerbehandlung zu gewährleisten.
 *
 * @enum {string}
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  SESSION_LIMIT_EXCEEDED = 'SESSION_LIMIT_EXCEEDED',
  REFRESH_RATE_LIMIT_EXCEEDED = 'REFRESH_RATE_LIMIT_EXCEEDED',
}
