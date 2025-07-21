import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RetryConfig, RetryUtil } from '../../../common/utils/retry.util';
import { CircuitBreaker, CircuitBreakerConfig } from '../../../common/utils/circuit-breaker.util';

/**
 * Enumeration representing the different types of security alerts that can be triggered
 * within a system. Each alert type corresponds to a specific security-related event.
 *
 * MEMBERS:
 * - ACCOUNT_LOCKED: Indicates that a user account has been locked due to unusual activity or security policy.
 * - SUSPICIOUS_LOGIN: Represents a login attempt flagged as suspicious based on contextual or behavioral analysis.
 * - BRUTE_FORCE_ATTEMPT: Indicates detection of repeated, unauthorized attempts to access an account.
 * - MULTIPLE_FAILED_ATTEMPTS: Represents an alert triggered after several consecutive failed login attempts.
 */
export enum SecurityAlertType {
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_LOGIN = 'SUSPICIOUS_LOGIN',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  MULTIPLE_FAILED_ATTEMPTS = 'MULTIPLE_FAILED_ATTEMPTS',
}

/**
 * Represents the payload for a security alert notification.
 *
 * Diese Schnittstelle definiert die Struktur für Sicherheitswarnungen,
 * die an externe Systeme (z.B. SIEM, Monitoring-Tools) gesendet werden.
 *
 * @interface SecurityAlertPayload
 * @example
 * ```typescript
 * const alert: SecurityAlertPayload = {
 *   type: SecurityAlertType.SUSPICIOUS_LOGIN,
 *   severity: 'high',
 *   timestamp: new Date(),
 *   details: {
 *     email: 'user@example.com',
 *     ipAddress: '192.168.1.100',
 *     riskScore: 85,
 *     message: 'Verdächtiger Login-Versuch erkannt'
 *   }
 * };
 * ```
 */
export interface SecurityAlertPayload {
  /**
   * Art der Sicherheitswarnung
   * @property {SecurityAlertType} type - Enum-Wert des Alert-Typs
   */
  type: SecurityAlertType;

  /**
   * Schweregrad der Warnung
   * @property {'low' | 'medium' | 'high' | 'critical'} severity - Klassifizierung der Bedrohungsstufe
   * - low: Informative Warnung, keine unmittelbare Gefahr
   * - medium: Auffälliges Verhalten, weitere Überwachung empfohlen
   * - high: Ernsthafte Sicherheitsbedenken, manuelle Prüfung erforderlich
   * - critical: Unmittelbare Bedrohung, sofortige Maßnahmen erforderlich
   */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /**
   * Zeitstempel des Ereignisses
   * @property {Date} timestamp - Exakter Zeitpunkt des sicherheitsrelevanten Ereignisses
   */
  timestamp: Date;

  /**
   * Detaillierte Informationen zum Sicherheitsereignis
   * @property {object} details - Container für ereignisspezifische Daten
   */
  details: {
    /**
     * E-Mail-Adresse des betroffenen Benutzers
     * @property {string} [email] - Wird bei benutzerbezogenen Alerts verwendet
     */
    email?: string;

    /**
     * Eindeutige Benutzer-ID
     * @property {string} [userId] - UUID oder andere eindeutige Kennung
     */
    userId?: string;

    /**
     * IP-Adresse des Verursachers
     * @property {string} [ipAddress] - IPv4 oder IPv6 Adresse
     */
    ipAddress?: string;

    /**
     * Browser/Client-Identifikation
     * @property {string} [userAgent] - User-Agent String des HTTP-Requests
     */
    userAgent?: string;

    /**
     * Berechneter Risiko-Score
     * @property {number} [riskScore] - Wert zwischen 0-100, höher = riskanter
     */
    riskScore?: number;

    /**
     * Anzahl fehlgeschlagener Versuche
     * @property {number} [failedAttempts] - Bei Login-bezogenen Alerts
     */
    failedAttempts?: number;

    /**
     * Zeitpunkt bis zur Account-Sperrung
     * @property {Date} [lockedUntil] - Bei ACCOUNT_LOCKED Alerts
     */
    lockedUntil?: Date;

    /**
     * Beschreibung des Sicherheitsereignisses
     * @property {string} message - Menschenlesbare Beschreibung des Vorfalls
     */
    message: string;

    /**
     * Zusätzliche kontextabhängige Informationen
     * @property {Record<string, any>} [additionalInfo] - Flexible Erweiterung für spezifische Alert-Typen
     */
    additionalInfo?: Record<string, any>;
  };
}

/**
 * Service zur Verwaltung und Versendung von Sicherheitswarnungen
 *
 * Dieser Service überwacht sicherheitsrelevante Ereignisse und sendet
 * Warnungen über Webhooks an externe Systeme. Unterstützt Retry-Logik
 * und Circuit Breaker Pattern für robuste Kommunikation.
 *
 * **Hauptfunktionen:**
 * - Versendung verschiedener Alert-Typen (Account-Sperrung, verdächtige Logins, Brute-Force)
 * - Robuste HTTP-Kommunikation mit Retry-Mechanismus und Circuit Breaker
 * - Konfigurierbare Schweregrade und Alert-Details
 * - Integration mit externen SIEM/Monitoring-Systemen
 *
 * **Konfiguration:**
 * Alert-Funktionalität wird über Umgebungsvariablen gesteuert:
 * - `SECURITY_ALERTS_ENABLED`: Globale Ein-/Ausschaltung
 * - `SECURITY_ALERT_WEBHOOK_URL`: Ziel-URL für Alert-Webhooks
 * - `SECURITY_ALERT_AUTH_TOKEN`: Bearer Token für Authentifizierung
 * - Weitere Retry/Circuit Breaker Parameter
 *
 * @example
 * ```typescript
 * // Service-Integration in Auth-Module
 * @Injectable()
 * export class AuthService {
 *   constructor(private securityAlertService: SecurityAlertService) {}
 *
 *   async handleFailedLogin(email: string, ip: string) {
 *     // ... Login-Logik ...
 *     if (failedAttempts > threshold) {
 *       await this.securityAlertService.sendAccountLockedAlert(
 *         email, userId, lockUntil, failedAttempts, ip
 *       );
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class SecurityAlertService {
  /** Logger-Instanz für Service-spezifische Ausgaben */
  private readonly logger = new Logger(SecurityAlertService.name);

  /** Konfigurierte Webhook-URL für Alert-Versendung */
  private readonly webhookUrl: string | null;

  /** Bearer Token für Webhook-Authentifizierung */
  private readonly webhookAuthToken: string | null;

  /** Globaler Schalter für Alert-Funktionalität */
  private readonly alertsEnabled: boolean;

  /** Utility für Retry-Operationen mit exponentieller Backoff-Strategie */
  private readonly retryUtil: RetryUtil;

  /** Circuit Breaker Instanz zur Fehlervermeidung bei Webhook-Ausfällen */
  private readonly circuitBreaker: CircuitBreaker;

  /** Konfiguration für Retry-Verhalten (Versuche, Delays, Timeouts) */
  private readonly retryConfig: Partial<RetryConfig>;

  /** Konfiguration für Circuit Breaker (Schwellwerte, Zeitfenster) */
  private readonly circuitBreakerConfig: Partial<CircuitBreakerConfig>;

  /**
   * Erstellt eine neue Instanz des SecurityAlertService
   *
   * Initialisiert alle erforderlichen Abhängigkeiten und konfiguriert
   * Retry-Mechanismen sowie Circuit Breaker basierend auf Umgebungsvariablen.
   *
   * @param {ConfigService} configService - NestJS Config-Service für Umgebungsvariablen
   * @param {HttpService} httpService - NestJS HTTP-Service für Webhook-Aufrufe
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('SECURITY_ALERT_WEBHOOK_URL', null);
    this.webhookAuthToken = this.configService.get<string>('SECURITY_ALERT_AUTH_TOKEN', null);
    this.alertsEnabled = this.configService.get<boolean>('SECURITY_ALERTS_ENABLED', false);

    // Retry-Konfiguration
    this.retryConfig = {
      maxRetries: this.configService.get<number>('SECURITY_ALERT_MAX_RETRIES', 3),
      baseDelay: this.configService.get<number>('SECURITY_ALERT_BASE_DELAY', 1000),
      maxDelay: this.configService.get<number>('SECURITY_ALERT_MAX_DELAY', 30000),
      backoffMultiplier: this.configService.get<number>('SECURITY_ALERT_BACKOFF_MULTIPLIER', 2),
      jitterFactor: this.configService.get<number>('SECURITY_ALERT_JITTER_FACTOR', 0.1),
      timeout: this.configService.get<number>('SECURITY_ALERT_TIMEOUT', 5000),
    };

    // Circuit Breaker Konfiguration
    this.circuitBreakerConfig = {
      failureThreshold: this.configService.get<number>('SECURITY_ALERT_FAILURE_THRESHOLD', 5),
      failureCountWindow: this.configService.get<number>('SECURITY_ALERT_FAILURE_WINDOW', 60000),
      openStateDuration: this.configService.get<number>('SECURITY_ALERT_OPEN_DURATION', 30000),
      successThreshold: this.configService.get<number>('SECURITY_ALERT_SUCCESS_THRESHOLD', 3),
      failureRateThreshold: this.configService.get<number>('SECURITY_ALERT_FAILURE_RATE', 50),
      minimumNumberOfCalls: this.configService.get<number>('SECURITY_ALERT_MIN_CALLS', 5),
    };

    this.retryUtil = new RetryUtil();
    this.circuitBreaker = new CircuitBreaker('SecurityAlertWebhook', this.circuitBreakerConfig);

    if (this.alertsEnabled && !this.webhookUrl) {
      this.logger.warn('Security alerts are enabled but no webhook URL is configured');
    }
  }

  /**
   * Sendet einen Security Alert via Webhook mit Retry und Circuit Breaker
   *
   * Diese zentrale Methode versendet Sicherheitswarnungen an externe Systeme
   * unter Verwendung robuster Fehlerbehandlungsstrategien. Sie implementiert
   * sowohl Retry-Logik als auch Circuit Breaker Pattern für hohe Verfügbarkeit.
   *
   * **Fehlerbehandlung:**
   * - Automatische Wiederholung bei temporären Fehlern
   * - Circuit Breaker verhindert Kaskadeneffekte
   * - Graceful Degradation: Alert-Fehler brechen nicht den Hauptfluss
   *
   * @param {SecurityAlertPayload} payload - Die zu sendenden Alert-Daten mit Typ, Schweregrad und Details
   * @returns {Promise<void>} Promise, das bei erfolgreicher Übertragung oder graceful failure erfüllt wird
   * @throws Wirft keine Exceptions - alle Fehler werden geloggt aber nicht weitergegeben
   *
   * @example
   * ```typescript
   * await securityAlertService.sendAlert({
   *   type: SecurityAlertType.SUSPICIOUS_LOGIN,
   *   severity: 'high',
   *   timestamp: new Date(),
   *   details: {
   *     email: 'user@example.com',
   *     ipAddress: '192.168.1.1',
   *     message: 'Verdächtiger Login erkannt'
   *   }
   * });
   * ```
   */
  async sendAlert(payload: SecurityAlertPayload): Promise<void> {
    if (!this.alertsEnabled || !this.webhookUrl) {
      this.logger.debug(
        `Security alert not sent (enabled: ${this.alertsEnabled}, webhook: ${!!this.webhookUrl})`,
      );
      return;
    }

    try {
      // Prüfe Circuit Breaker Status
      const circuitStatus = this.circuitBreaker.getStatus();
      if (circuitStatus.state === 'OPEN') {
        this.logger.warn(
          `Circuit breaker is OPEN, skipping alert. Last failure: ${circuitStatus.lastFailureTime}`,
        );
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.webhookAuthToken) {
        headers['Authorization'] = `Bearer ${this.webhookAuthToken}`;
      }

      // Webhook-Aufruf mit Circuit Breaker und Retry
      await this.circuitBreaker.execute(async () => {
        return await this.retryUtil.executeWithRetry(
          async () => {
            const response = await firstValueFrom(
              this.httpService.post(this.webhookUrl, payload, {
                headers,
                timeout: this.retryConfig.timeout || 5000,
              }),
            );

            // Prüfe auf erfolgreiche HTTP-Antwort
            if (response.status < 200 || response.status >= 300) {
              throw new Error(`Webhook returned status ${response.status}`);
            }

            return response;
          },
          this.retryConfig,
          `SecurityAlert-${payload.type}`,
        );
      });

      this.logger.log(
        `Security alert sent: ${payload.type} for ${payload.details.email || 'unknown'}`,
      );
    } catch (error) {
      if (error.name === 'CircuitBreakerOpenError') {
        this.logger.warn(
          `Circuit breaker prevented alert delivery for ${payload.type}. Alert dropped to prevent cascading failures.`,
        );
      } else {
        this.logger.error(
          `Failed to send security alert after retries: ${error.message}`,
          error.stack,
        );
      }
      // Alerts should not break the main flow
    }
  }

  /**
   * Sendet einen Alert für einen gesperrten Account
   *
   * @param email - E-Mail-Adresse des gesperrten Accounts
   * @param userId - Benutzer-ID (optional)
   * @param lockedUntil - Zeitpunkt bis zu dem der Account gesperrt ist
   * @param failedAttempts - Anzahl der fehlgeschlagenen Versuche
   * @param ipAddress - IP-Adresse des letzten Versuchs (optional)
   * @returns Promise<void>
   */
  async sendAccountLockedAlert(
    email: string,
    userId: string | null,
    lockedUntil: Date,
    failedAttempts: number,
    ipAddress?: string,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.ACCOUNT_LOCKED,
      severity: 'high',
      timestamp: new Date(),
      details: {
        email,
        userId,
        ipAddress,
        lockedUntil,
        failedAttempts,
        message: `Account ${email} has been locked until ${lockedUntil.toISOString()} after ${failedAttempts} failed login attempts`,
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Sendet einen Alert für einen verdächtigen Login-Versuch
   *
   * @param email - E-Mail-Adresse des verdächtigen Logins
   * @param userId - Benutzer-ID (optional)
   * @param ipAddress - IP-Adresse des Login-Versuchs
   * @param userAgent - User-Agent String
   * @param riskScore - Berechneter Risiko-Score (0-100)
   * @param reason - Grund für die Verdachtsmarkierung
   * @returns Promise<void>
   */
  async sendSuspiciousLoginAlert(
    email: string,
    userId: string | null,
    ipAddress: string,
    userAgent: string,
    riskScore: number,
    reason: string,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.SUSPICIOUS_LOGIN,
      severity: riskScore >= 80 ? 'critical' : 'high',
      timestamp: new Date(),
      details: {
        email,
        userId,
        ipAddress,
        userAgent,
        riskScore,
        message: `Suspicious login attempt detected for ${email} with risk score ${riskScore}. Reason: ${reason}`,
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Sendet einen Alert für Brute-Force-Versuche
   *
   * Wird ausgelöst, wenn eine IP-Adresse eine außergewöhnlich hohe Anzahl
   * von Login-Versuchen in kurzer Zeit durchführt. Dies deutet auf einen
   * automatisierten Angriff hin, der sofortige Gegenmaßnahmen erfordert.
   *
   * @param {string} ipAddress - Die verdächtige IP-Adresse des Angreifers
   * @param {number} attemptCount - Anzahl der Login-Versuche im Zeitfenster
   * @param {number} timeWindowMinutes - Zeitfenster der Überwachung in Minuten
   * @returns {Promise<void>} Promise für die Alert-Übertragung
   *
   * @example
   * ```typescript
   * // 50 Login-Versuche in 10 Minuten von einer IP
   * await sendBruteForceAlert('192.168.1.100', 50, 10);
   * // Erzeugt CRITICAL Alert mit Empfehlung für IP-Blocking
   * ```
   */
  async sendBruteForceAlert(
    ipAddress: string,
    attemptCount: number,
    timeWindowMinutes: number,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.BRUTE_FORCE_ATTEMPT,
      severity: 'critical',
      timestamp: new Date(),
      details: {
        ipAddress,
        message: `Potential brute force attack detected from IP ${ipAddress}. ${attemptCount} attempts in ${timeWindowMinutes} minutes`,
        additionalInfo: {
          attemptCount,
          timeWindowMinutes,
        },
      },
    };

    await this.sendAlert(payload);
  }

  /**
   * Sendet einen Alert für mehrere fehlgeschlagene Login-Versuche
   *
   * Warnt vor wiederholten fehlgeschlagenen Login-Versuchen für einen
   * spezifischen Benutzer. Dient als Frühwarnsystem vor Account-Sperren
   * und ermöglicht proaktive Sicherheitsmaßnahmen.
   *
   * @param {string} email - E-Mail des betroffenen Benutzers
   * @param {string | null} userId - Benutzer-ID (falls verfügbar)
   * @param {number} failedAttempts - Anzahl der bisherigen fehlgeschlagenen Versuche
   * @param {number} remainingAttempts - Verbleibende Versuche vor Account-Sperrung
   * @param {string} [ipAddress] - IP-Adresse der Versuche (optional)
   * @returns {Promise<void>} Promise für die Alert-Übertragung
   *
   * @example
   * ```typescript
   * // 4 von 5 erlaubten Versuchen verbraucht
   * await sendMultipleFailedAttemptsAlert(
   *   'user@example.com',
   *   'user-123',
   *   4,
   *   1,
   *   '192.168.1.1'
   * );
   * // Erzeugt HIGH severity Alert (nur noch 1 Versuch übrig)
   * ```
   */
  async sendMultipleFailedAttemptsAlert(
    email: string,
    userId: string | null,
    failedAttempts: number,
    remainingAttempts: number,
    ipAddress?: string,
  ): Promise<void> {
    const payload: SecurityAlertPayload = {
      type: SecurityAlertType.MULTIPLE_FAILED_ATTEMPTS,
      severity: remainingAttempts <= 1 ? 'high' : 'medium',
      timestamp: new Date(),
      details: {
        email,
        userId,
        ipAddress,
        failedAttempts,
        message: `Multiple failed login attempts for ${email}. ${failedAttempts} failed attempts, ${remainingAttempts} attempts remaining before lockout`,
        additionalInfo: {
          remainingAttempts,
        },
      },
    };

    await this.sendAlert(payload);
  }
}
