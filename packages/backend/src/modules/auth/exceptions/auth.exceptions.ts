import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthErrorCode } from '../constants/auth.constants';

/**
 * Basis-Klasse für Authentifizierungsfehler mit erweiterten Informationen
 *
 * Erweitert die Standard-UnauthorizedException um strukturierte Fehlercodes
 * und zusätzliche Details für verbesserte Fehlerbehandlung im Frontend.
 * Alle Auth-spezifischen Exceptions sollten von dieser Klasse erben.
 *
 * @abstract
 * @class AuthException
 * @extends {UnauthorizedException}
 *
 * @example
 * ```typescript
 * class CustomAuthException extends AuthException {
 *   constructor() {
 *     super('Custom error message', AuthErrorCode.CUSTOM_ERROR, {
 *       additionalInfo: 'value'
 *     });
 *   }
 * }
 * ```
 */
export abstract class AuthException extends UnauthorizedException {
  /**
   * Erstellt eine neue AuthException
   *
   * @param {string} message - Fehlermeldung für den Benutzer
   * @param {AuthErrorCode} code - Strukturierter Fehlercode für Frontend-Handling
   * @param {Record<string, any>} [details] - Zusätzliche Kontextinformationen
   */
  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly details?: Record<string, any>,
  ) {
    super({
      message,
      code,
      ...details,
    });
  }
}

/**
 * Fehler bei ungültigen Anmeldedaten
 *
 * Wird geworfen, wenn E-Mail oder Passwort nicht korrekt sind.
 * Kann optional die Anzahl verbleibender Versuche enthalten.
 *
 * @class InvalidCredentialsException
 * @extends {AuthException}
 *
 * @throws {InvalidCredentialsException} Wenn Login-Daten ungültig sind
 */
export class InvalidCredentialsException extends AuthException {
  /**
   * Erstellt eine neue InvalidCredentialsException
   *
   * @param {number} [remainingAttempts] - Anzahl verbleibender Login-Versuche
   * @param {string} [customMessage] - Benutzerdefinierte Fehlermeldung
   *
   * @example
   * ```typescript
   * // Ohne verbleibende Versuche
   * throw new InvalidCredentialsException();
   *
   * // Mit verbleibenden Versuchen
   * throw new InvalidCredentialsException(2, 'Invalid email or password. 2 attempts remaining.');
   * ```
   */
  constructor(remainingAttempts?: number, customMessage?: string) {
    super(
      customMessage || 'Invalid credentials',
      AuthErrorCode.INVALID_CREDENTIALS,
      remainingAttempts !== undefined ? { remainingAttempts } : undefined,
    );
  }
}

/**
 * Fehler bei deaktiviertem Account
 *
 * Wird geworfen, wenn ein Benutzer versucht sich mit einem
 * deaktivierten Account anzumelden. Der Account muss erst durch
 * einen Administrator reaktiviert werden.
 *
 * @class AccountDisabledException
 * @extends {AuthException}
 *
 * @throws {AccountDisabledException} Wenn Account deaktiviert ist
 */
export class AccountDisabledException extends AuthException {
  /**
   * Erstellt eine neue AccountDisabledException
   *
   * @example
   * ```typescript
   * if (!user.isActive) {
   *   throw new AccountDisabledException();
   * }
   * ```
   */
  constructor() {
    super('Account is disabled', AuthErrorCode.ACCOUNT_DISABLED);
  }
}

/**
 * Fehler bei gesperrtem Account
 *
 * Wird geworfen, wenn ein Account aufgrund zu vieler fehlgeschlagener
 * Login-Versuche oder aus Sicherheitsgründen gesperrt wurde.
 * Enthält den Zeitpunkt, bis zu dem der Account gesperrt bleibt.
 *
 * @class AccountLockedException
 * @extends {AuthException}
 *
 * @throws {AccountLockedException} Wenn Account temporär gesperrt ist
 */
export class AccountLockedException extends AuthException {
  /**
   * Erstellt eine neue AccountLockedException
   *
   * @param {Date} lockedUntil - Zeitpunkt bis zu dem der Account gesperrt ist
   *
   * @example
   * ```typescript
   * const lockUntil = new Date(Date.now() + 3600000); // 1 Stunde
   * throw new AccountLockedException(lockUntil);
   * ```
   */
  constructor(lockedUntil: Date) {
    super('Account is locked', AuthErrorCode.ACCOUNT_LOCKED, {
      lockedUntil: lockedUntil.toISOString(),
    });
  }
}

/**
 * Fehler bei abgelaufenem Token
 *
 * Wird geworfen, wenn ein JWT-Token sein Ablaufdatum überschritten hat
 * und nicht mehr gültig ist. Der Client sollte versuchen, den Token
 * mit einem Refresh-Token zu erneuern.
 *
 * @class TokenExpiredException
 * @extends {AuthException}
 *
 * @throws {TokenExpiredException} Wenn JWT-Token abgelaufen ist
 */
export class TokenExpiredException extends AuthException {
  /**
   * Erstellt eine neue TokenExpiredException
   *
   * @example
   * ```typescript
   * try {
   *   const payload = jwt.verify(token, secret);
   * } catch (error) {
   *   if (error.name === 'TokenExpiredError') {
   *     throw new TokenExpiredException();
   *   }
   * }
   * ```
   */
  constructor() {
    super('Token has expired', AuthErrorCode.TOKEN_EXPIRED);
  }
}

/**
 * Fehler bei ungültigem Token
 *
 * Wird geworfen, wenn ein Token ungültig ist (falsche Signatur,
 * ungültiges Format, manipuliert, etc.). Der Token kann nicht
 * erneuert werden und eine neue Anmeldung ist erforderlich.
 *
 * @class InvalidTokenException
 * @extends {AuthException}
 *
 * @throws {InvalidTokenException} Wenn JWT-Token ungültig ist
 */
export class InvalidTokenException extends AuthException {
  /**
   * Erstellt eine neue InvalidTokenException
   *
   * @param {string} [reason] - Spezifischer Grund für die Ungültigkeit
   *
   * @example
   * ```typescript
   * // Ohne spezifischen Grund
   * throw new InvalidTokenException();
   *
   * // Mit spezifischem Grund
   * throw new InvalidTokenException('Invalid signature');
   * ```
   */
  constructor(reason?: string) {
    super('Invalid token', AuthErrorCode.TOKEN_INVALID, reason ? { reason } : undefined);
  }
}

/**
 * Fehler bei widerrufenem Token
 *
 * Wird geworfen, wenn ein Token explizit widerrufen wurde,
 * z.B. nach Logout oder aus Sicherheitsgründen. Der Token
 * ist permanent ungültig und kann nicht erneuert werden.
 *
 * @class TokenRevokedException
 * @extends {AuthException}
 *
 * @throws {TokenRevokedException} Wenn JWT-Token widerrufen wurde
 */
export class TokenRevokedException extends AuthException {
  /**
   * Erstellt eine neue TokenRevokedException
   *
   * @example
   * ```typescript
   * const isRevoked = await tokenBlacklist.isRevoked(token);
   * if (isRevoked) {
   *   throw new TokenRevokedException();
   * }
   * ```
   */
  constructor() {
    super('Token has been revoked', AuthErrorCode.TOKEN_REVOKED);
  }
}

/**
 * Fehler bei Überschreitung des Session-Limits
 *
 * Wird geworfen, wenn ein Benutzer versucht mehr Sessions zu erstellen
 * als erlaubt sind (z.B. max. 5 gleichzeitige Geräte). Der Benutzer
 * muss bestehende Sessions beenden oder das Limit erhöhen lassen.
 *
 * @class SessionLimitExceededException
 * @extends {ForbiddenException}
 *
 * @throws {SessionLimitExceededException} Wenn max. Sessions erreicht
 */
export class SessionLimitExceededException extends ForbiddenException {
  /**
   * Erstellt eine neue SessionLimitExceededException
   *
   * @param {number} maxSessions - Maximale Anzahl erlaubter Sessions
   *
   * @example
   * ```typescript
   * const activeSessions = await sessionService.countActive(userId);
   * if (activeSessions >= MAX_SESSIONS) {
   *   throw new SessionLimitExceededException(MAX_SESSIONS);
   * }
   * ```
   */
  constructor(maxSessions: number) {
    super({
      message: 'Session limit exceeded',
      code: AuthErrorCode.SESSION_LIMIT_EXCEEDED,
      maxSessions,
    });
  }
}

/**
 * Fehler bei Überschreitung des Refresh-Rate-Limits
 *
 * Wird geworfen, wenn zu viele Token-Refresh-Anfragen in zu kurzer
 * Zeit gestellt werden (Rate Limiting). Verhindert Missbrauch und
 * schützt vor automatisierten Angriffen.
 *
 * @class RefreshRateLimitExceededException
 * @extends {ForbiddenException}
 *
 * @throws {RefreshRateLimitExceededException} Wenn Rate-Limit überschritten
 */
export class RefreshRateLimitExceededException extends ForbiddenException {
  /**
   * Erstellt eine neue RefreshRateLimitExceededException
   *
   * @param {Date} retryAfter - Zeitpunkt ab dem ein erneuter Versuch erlaubt ist
   *
   * @example
   * ```typescript
   * const rateLimitExceeded = await rateLimiter.isExceeded(userId);
   * if (rateLimitExceeded) {
   *   const retryAfter = new Date(Date.now() + 60000); // 1 Minute
   *   throw new RefreshRateLimitExceededException(retryAfter);
   * }
   * ```
   */
  constructor(retryAfter: Date) {
    super({
      message: 'Too many refresh attempts',
      code: AuthErrorCode.REFRESH_RATE_LIMIT_EXCEEDED,
      retryAfter: retryAfter.toISOString(),
    });
  }
}
