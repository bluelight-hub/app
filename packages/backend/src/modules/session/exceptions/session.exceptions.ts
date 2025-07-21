import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception für nicht gefundene Sessions
 *
 * Wird geworfen, wenn eine angeforderte Session nicht in der Datenbank
 * gefunden werden kann. Dies kann auftreten, wenn eine Session bereits
 * gelöscht wurde oder eine ungültige Session-ID übergeben wurde.
 *
 * @class SessionNotFoundException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // In einem Service
 * const session = await this.findById(sessionId);
 * if (!session) {
 *   throw new SessionNotFoundException(sessionId);
 * }
 *
 * // Antwort: HTTP 404
 * // {
 * //   "statusCode": 404,
 * //   "message": "Session with ID sess_abc123 not found"
 * // }
 * ```
 */
export class SessionNotFoundException extends HttpException {
  /**
   * Konstruktor für SessionNotFoundException
   *
   * @param {string} sessionId - ID der nicht gefundenen Session
   */
  constructor(sessionId: string) {
    super(`Session with ID ${sessionId} not found`, HttpStatus.NOT_FOUND);
  }
}

/**
 * Exception für abgelaufene Sessions
 *
 * Wird geworfen, wenn versucht wird, eine Session zu verwenden,
 * deren Gültigkeitsdauer abgelaufen ist. Die Session existiert noch
 * in der Datenbank, ist aber nicht mehr gültig.
 *
 * @class SessionExpiredException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // Validierung der Session
 * if (session.expiresAt < new Date()) {
 *   throw new SessionExpiredException(session.id);
 * }
 *
 * // Antwort: HTTP 401
 * // {
 * //   "statusCode": 401,
 * //   "message": "Session sess_abc123 has expired"
 * // }
 * ```
 */
export class SessionExpiredException extends HttpException {
  /**
   * Konstruktor für SessionExpiredException
   *
   * @param {string} sessionId - ID der abgelaufenen Session
   */
  constructor(sessionId: string) {
    super(`Session ${sessionId} has expired`, HttpStatus.UNAUTHORIZED);
  }
}

/**
 * Exception für widerrufene Sessions
 *
 * Wird geworfen, wenn eine Session aktiv widerrufen wurde,
 * z.B. durch Logout, Sicherheitsereignisse oder administrative
 * Aktionen. Optional kann ein Grund für den Widerruf angegeben werden.
 *
 * @class SessionRevokedException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // Session widerrufen mit Grund
 * if (session.isRevoked) {
 *   throw new SessionRevokedException(
 *     session.id,
 *     'Security policy violation detected'
 *   );
 * }
 *
 * // Antwort: HTTP 401
 * // {
 * //   "statusCode": 401,
 * //   "message": "Session sess_abc123 has been revoked: Security policy violation detected"
 * // }
 * ```
 */
export class SessionRevokedException extends HttpException {
  /**
   * Konstruktor für SessionRevokedException
   *
   * @param {string} sessionId - ID der widerrufenen Session
   * @param {string} [reason] - Optionaler Grund für den Widerruf
   */
  constructor(sessionId: string, reason?: string) {
    super(
      `Session ${sessionId} has been revoked${reason ? `: ${reason}` : ''}`,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Exception für überschrittenes Session-Limit
 *
 * Wird geworfen, wenn ein Benutzer versucht, mehr Sessions zu erstellen
 * als das konfigurierte Maximum erlaubt. Dies verhindert Session-Flooding
 * und begrenzt die Anzahl gleichzeitiger Anmeldungen.
 *
 * @class SessionLimitExceededException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // Prüfung des Session-Limits
 * const activeSessions = await this.countActiveSessions(userId);
 * if (activeSessions >= MAX_SESSIONS_PER_USER) {
 *   throw new SessionLimitExceededException(userId, MAX_SESSIONS_PER_USER);
 * }
 *
 * // Antwort: HTTP 403
 * // {
 * //   "statusCode": 403,
 * //   "message": "User user_123 has exceeded the maximum session limit of 5"
 * // }
 * ```
 */
export class SessionLimitExceededException extends HttpException {
  /**
   * Konstruktor für SessionLimitExceededException
   *
   * @param {string} userId - ID des betroffenen Benutzers
   * @param {number} limit - Maximale Anzahl erlaubter Sessions
   */
  constructor(userId: string, limit: number) {
    super(
      `User ${userId} has exceeded the maximum session limit of ${limit}`,
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Exception für ungültige Sessions
 *
 * Allgemeine Exception für verschiedene Arten von Session-Ungültigkeit,
 * z.B. manipulierte Tokens, fehlende Metadaten oder inkonsistente Daten.
 * Der spezifische Grund wird als Parameter übergeben.
 *
 * @class InvalidSessionException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // Validierung der Session-Daten
 * if (!session.metadata?.userAgent) {
 *   throw new InvalidSessionException('Missing required user agent metadata');
 * }
 *
 * // Token-Validierung
 * if (!this.isValidToken(session.refreshToken)) {
 *   throw new InvalidSessionException('Invalid or corrupted refresh token');
 * }
 *
 * // Antwort: HTTP 400
 * // {
 * //   "statusCode": 400,
 * //   "message": "Invalid session: Invalid or corrupted refresh token"
 * // }
 * ```
 */
export class InvalidSessionException extends HttpException {
  /**
   * Konstruktor für InvalidSessionException
   *
   * @param {string} reason - Grund für die Ungültigkeit der Session
   */
  constructor(reason: string) {
    super(`Invalid session: ${reason}`, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception bei Erkennung von hohem Risiko in einer Session
 *
 * Wird geworfen, wenn das Risiko-Bewertungssystem ein erhöhtes
 * Sicherheitsrisiko für eine Session feststellt. Enthält den
 * Risiko-Score und die Faktoren, die zur Bewertung beigetragen haben.
 *
 * @class SessionRiskDetectedException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // Risiko-Bewertung durchführen
 * const riskAssessment = await this.assessSessionRisk(session);
 * if (riskAssessment.score > RISK_THRESHOLD) {
 *   throw new SessionRiskDetectedException(
 *     session.id,
 *     riskAssessment.score,
 *     riskAssessment.factors
 *   );
 * }
 *
 * // Antwort: HTTP 403
 * // {
 * //   "statusCode": 403,
 * //   "message": "High risk detected for session sess_abc123",
 * //   "riskScore": 85,
 * //   "factors": [
 * //     "Unusual location",
 * //     "Multiple failed auth attempts",
 * //     "Suspicious user agent"
 * //   ]
 * // }
 * ```
 */
export class SessionRiskDetectedException extends HttpException {
  /**
   * Konstruktor für SessionRiskDetectedException
   *
   * @param {string} sessionId - ID der risikobehafteten Session
   * @param {number} riskScore - Numerischer Risiko-Score (0-100)
   * @param {string[]} factors - Liste der Risikofaktoren
   */
  constructor(sessionId: string, riskScore: number, factors: string[]) {
    super(
      {
        message: `High risk detected for session ${sessionId}`,
        riskScore,
        factors,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Exception für Fehler bei Session-Aktivitäten
 *
 * Allgemeine Exception für Fehler im Zusammenhang mit Session-Aktivitäten,
 * wie z.B. fehlerhafte Activity-Logs, ungültige Zeitstempel oder
 * inkonsistente Aktivitätsdaten.
 *
 * @class SessionActivityException
 * @extends {HttpException}
 *
 * @example
 * ```typescript
 * // Aktivität validieren
 * if (activity.timestamp > new Date()) {
 *   throw new SessionActivityException('Activity timestamp cannot be in the future');
 * }
 *
 * // Aktivitätstyp prüfen
 * if (!VALID_ACTIVITY_TYPES.includes(activity.type)) {
 *   throw new SessionActivityException(`Invalid activity type: ${activity.type}`);
 * }
 *
 * // Antwort: HTTP 400
 * // {
 * //   "statusCode": 400,
 * //   "message": "Session activity error: Activity timestamp cannot be in the future"
 * // }
 * ```
 */
export class SessionActivityException extends HttpException {
  /**
   * Konstruktor für SessionActivityException
   *
   * @param {string} message - Fehlerbeschreibung
   */
  constructor(message: string) {
    super(`Session activity error: ${message}`, HttpStatus.BAD_REQUEST);
  }
}
