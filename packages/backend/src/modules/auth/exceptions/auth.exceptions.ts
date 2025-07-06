import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthErrorCode } from '../constants/auth.constants';

/**
 * Basis-Klasse für Authentifizierungsfehler mit erweiterten Informationen
 */
export abstract class AuthException extends UnauthorizedException {
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
 */
export class InvalidCredentialsException extends AuthException {
  constructor(remainingAttempts?: number) {
    super(
      'Invalid credentials',
      AuthErrorCode.INVALID_CREDENTIALS,
      remainingAttempts !== undefined ? { remainingAttempts } : undefined,
    );
  }
}

/**
 * Fehler bei deaktiviertem Account
 */
export class AccountDisabledException extends AuthException {
  constructor() {
    super('Account is disabled', AuthErrorCode.ACCOUNT_DISABLED);
  }
}

/**
 * Fehler bei gesperrtem Account
 */
export class AccountLockedException extends AuthException {
  constructor(lockedUntil: Date) {
    super('Account is locked', AuthErrorCode.ACCOUNT_LOCKED, {
      lockedUntil: lockedUntil.toISOString(),
    });
  }
}

/**
 * Fehler bei abgelaufenem Token
 */
export class TokenExpiredException extends AuthException {
  constructor() {
    super('Token has expired', AuthErrorCode.TOKEN_EXPIRED);
  }
}

/**
 * Fehler bei ungültigem Token
 */
export class InvalidTokenException extends AuthException {
  constructor(reason?: string) {
    super('Invalid token', AuthErrorCode.TOKEN_INVALID, reason ? { reason } : undefined);
  }
}

/**
 * Fehler bei widerrufenem Token
 */
export class TokenRevokedException extends AuthException {
  constructor() {
    super('Token has been revoked', AuthErrorCode.TOKEN_REVOKED);
  }
}

/**
 * Fehler bei Überschreitung des Session-Limits
 */
export class SessionLimitExceededException extends ForbiddenException {
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
 */
export class RefreshRateLimitExceededException extends ForbiddenException {
  constructor(retryAfter: Date) {
    super({
      message: 'Too many refresh attempts',
      code: AuthErrorCode.REFRESH_RATE_LIMIT_EXCEEDED,
      retryAfter: retryAfter.toISOString(),
    });
  }
}
