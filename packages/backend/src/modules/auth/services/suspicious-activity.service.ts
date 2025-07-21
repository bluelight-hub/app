import { Injectable, Logger } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Service zur Erkennung verdächtiger Aktivitätsmuster
 *
 * Analysiert Verhaltensmuster in Echtzeit und erkennt potenzielle
 * Sicherheitsrisiken wie Brute-Force-Angriffe, Account-Enumeration,
 * ungewöhnliche Login-Zeiten und verdächtige IP-Aktivitäten.
 *
 * Der Service arbeitet mit konfigurierbaren Schwellenwerten und
 * emittiert Events für automatische Gegenmaßnahmen.
 *
 * @class SuspiciousActivityService
 * @injectable
 *
 * @example
 * ```typescript
 * // Prüfung bei Login
 * await suspiciousActivityService.checkLoginPatterns(
 *   'user123',
 *   '192.168.1.100'
 * );
 *
 * // Prüfung auf Brute-Force
 * await suspiciousActivityService.checkBruteForcePattern('192.168.1.100');
 *
 * // Event-Listener für verdächtige Aktivitäten
 * eventEmitter.on('security.suspicious.activity', (data) => {
 *   logger.warn(`Verdächtige Aktivität: ${data.type}`);
 * });
 * ```
 */
@Injectable()
export class SuspiciousActivityService {
  /**
   * Logger-Instanz für Service-Meldungen
   * @private
   * @property {Logger} logger
   */
  private readonly logger = new Logger(SuspiciousActivityService.name);

  /**
   * Schwellenwert für schnelle Login-Versuche
   *
   * Anzahl der Logins innerhalb einer Minute, die als verdächtig gelten
   *
   * @private
   * @property {number} RAPID_LOGIN_THRESHOLD
   * @default 3
   */
  private readonly RAPID_LOGIN_THRESHOLD = 3; // Logins in 1 Minute

  /**
   * Schwellenwert für mehrere IP-Adressen
   *
   * Anzahl unterschiedlicher IPs in 10 Minuten, die als verdächtig gelten
   *
   * @private
   * @property {number} MULTIPLE_IP_THRESHOLD
   * @default 3
   */
  private readonly MULTIPLE_IP_THRESHOLD = 3; // Different IPs in 10 minutes

  /**
   * Schwellenwert für Brute-Force-Erkennung
   *
   * Anzahl fehlgeschlagener Versuche in 5 Minuten für Brute-Force-Warnung
   *
   * @private
   * @property {number} BRUTEFORCE_THRESHOLD
   * @default 10
   */
  private readonly BRUTEFORCE_THRESHOLD = 10; // Failed attempts in 5 minutes

  /**
   * Beginn der ungewöhnlichen Login-Zeit (Stunde)
   *
   * @private
   * @property {number} UNUSUAL_TIME_START
   * @default 0 (Mitternacht)
   */
  private readonly UNUSUAL_TIME_START = 0; // 00:00

  /**
   * Ende der ungewöhnlichen Login-Zeit (Stunde)
   *
   * @private
   * @property {number} UNUSUAL_TIME_END
   * @default 6 (6 Uhr morgens)
   */
  private readonly UNUSUAL_TIME_END = 6; // 06:00

  /**
   * Konstruktor des SuspiciousActivityService
   *
   * @param {SecurityLogService} securityLogService - Service für Sicherheitslogs
   * @param {EventEmitter2} eventEmitter - Event-Emitter für Sicherheitsereignisse
   */
  constructor(
    private readonly securityLogService: SecurityLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Überprüft auf verdächtige Login-Muster für einen Benutzer
   *
   * Führt mehrere Prüfungen parallel durch:
   * - Schnelle aufeinanderfolgende Login-Versuche
   * - Logins von mehreren IP-Adressen
   * - Logins zu ungewöhnlichen Zeiten
   *
   * @param {string} userId - ID des zu prüfenden Benutzers
   * @param {string} [ipAddress] - Optionale IP-Adresse des aktuellen Logins
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Bei erfolgreichem Login
   * await suspiciousActivityService.checkLoginPatterns(
   *   user.id,
   *   request.ip
   * );
   *
   * // Alle Prüfungen laufen parallel für bessere Performance
   * ```
   */
  async checkLoginPatterns(userId: string, ipAddress?: string): Promise<void> {
    await Promise.all([
      this.checkRapidLoginAttempts(userId),
      this.checkMultipleIpAddresses(userId),
      this.checkUnusualLoginTime(userId, ipAddress),
    ]);
  }

  /**
   * Überprüft auf Brute-Force-Angriffe von einer IP
   *
   * Analysiert fehlgeschlagene Login-Versuche von einer spezifischen
   * IP-Adresse innerhalb der letzten 5 Minuten. Bei Überschreitung
   * des Schwellenwerts wird ein Sicherheitsevent ausgelöst.
   *
   * @param {string} ipAddress - Zu prüfende IP-Adresse
   * @returns {Promise<void>} Promise ohne Rückgabewert
   * @emits security.bruteforce.detected - Bei Erkennung eines Brute-Force-Angriffs
   *
   * @example
   * ```typescript
   * // Nach fehlgeschlagenem Login
   * await suspiciousActivityService.checkBruteForcePattern(request.ip);
   *
   * // Event-Handler für automatische IP-Blockierung
   * eventEmitter.on('security.bruteforce.detected', async (data) => {
   *   await blockIpAddress(data.ipAddress);
   * });
   * ```
   */
  async checkBruteForcePattern(ipAddress: string): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const failedAttempts = await this.securityLogService.getSecurityLogs({
      ipAddress,
      eventType: SecurityEventType.LOGIN_FAILED,
      startDate: fiveMinutesAgo,
      endDate: new Date(),
    });

    if (failedAttempts.length >= this.BRUTEFORCE_THRESHOLD) {
      await this.reportSuspiciousActivity(
        'brute_force_attempt',
        undefined,
        {
          attemptCount: failedAttempts.length,
          timeWindow: '5 minutes',
          targetUsers: failedAttempts.map((log) => log.userId).filter(Boolean),
        },
        ipAddress,
      );

      // Emit event for automatic IP blocking
      this.eventEmitter.emit('security.bruteforce.detected', {
        ipAddress,
        attemptCount: failedAttempts.length,
      });
    }
  }

  /**
   * Überprüft auf Account-Enumeration-Versuche
   *
   * Erkennt Versuche, verschiedene Benutzernamen von derselben IP
   * auszuprobieren, was auf Account-Enumeration hindeutet. Dies ist
   * ein typisches Angriffsmuster zum Identifizieren gültiger Konten.
   *
   * @param {string} ipAddress - Zu prüfende IP-Adresse
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Nach mehreren fehlgeschlagenen Logins mit verschiedenen Benutzernamen
   * await suspiciousActivityService.checkAccountEnumeration(request.ip);
   *
   * // Wird ausgelöst bei >= 5 verschiedenen Benutzernamen in 5 Minuten
   * ```
   */
  async checkAccountEnumeration(ipAddress: string): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const failedAttempts = await this.securityLogService.getSecurityLogs({
      ipAddress,
      eventType: SecurityEventType.LOGIN_FAILED,
      startDate: fiveMinutesAgo,
      endDate: new Date(),
    });

    // Check for attempts with different usernames
    const uniqueUsernames = new Set(
      failedAttempts.map((log) => (log.metadata as any)?.username).filter(Boolean),
    );

    if (uniqueUsernames.size >= 5) {
      await this.reportSuspiciousActivity(
        'account_enumeration',
        undefined,
        {
          attemptCount: failedAttempts.length,
          uniqueUsernames: uniqueUsernames.size,
          timeWindow: '5 minutes',
        },
        ipAddress,
      );
    }
  }

  /**
   * Überprüft auf zu viele Login-Versuche in kurzer Zeit
   *
   * Erkennt ungewöhnlich schnelle aufeinanderfolgende erfolgreiche
   * Logins, die auf automatisierte Aktivitäten oder kompromittierte
   * Zugangsdaten hindeuten können.
   *
   * @private
   * @param {string} userId - ID des zu prüfenden Benutzers
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Wird intern von checkLoginPatterns aufgerufen
   * await this.checkRapidLoginAttempts('user123');
   *
   * // Löst Warnung aus bei >= 3 Logins in 1 Minute
   * ```
   */
  private async checkRapidLoginAttempts(userId: string): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentLogins = await this.securityLogService.getSecurityLogs({
      userId,
      eventType: SecurityEventType.LOGIN_SUCCESS,
      startDate: oneMinuteAgo,
      endDate: new Date(),
    });

    if (recentLogins.length >= this.RAPID_LOGIN_THRESHOLD) {
      await this.reportSuspiciousActivity('rapid_login_attempts', userId, {
        loginCount: recentLogins.length,
        timeWindow: '1 minute',
        ips: recentLogins.map((log) => log.ipAddress).filter(Boolean),
      });
    }
  }

  /**
   * Überprüft auf Logins von mehreren IP-Adressen
   *
   * Erkennt wenn ein Benutzer sich innerhalb kurzer Zeit von
   * verschiedenen IP-Adressen anmeldet, was auf geteilte Zugangsdaten
   * oder Account-Übernahme hindeuten kann.
   *
   * @private
   * @param {string} userId - ID des zu prüfenden Benutzers
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Wird intern von checkLoginPatterns aufgerufen
   * await this.checkMultipleIpAddresses('user123');
   *
   * // Löst Warnung aus bei >= 3 verschiedenen IPs in 10 Minuten
   * ```
   */
  private async checkMultipleIpAddresses(userId: string): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentLogins = await this.securityLogService.getSecurityLogs({
      userId,
      eventType: SecurityEventType.LOGIN_SUCCESS,
      startDate: tenMinutesAgo,
      endDate: new Date(),
    });

    const uniqueIps = new Set(recentLogins.map((log) => log.ipAddress).filter(Boolean));

    if (uniqueIps.size >= this.MULTIPLE_IP_THRESHOLD) {
      await this.reportSuspiciousActivity('multiple_ip_login', userId, {
        ipCount: uniqueIps.size,
        ips: Array.from(uniqueIps),
        timeWindow: '10 minutes',
      });
    }
  }

  /**
   * Überprüft auf Logins zu ungewöhnlichen Zeiten
   *
   * Erkennt Login-Versuche außerhalb der normalen Geschäftszeiten
   * (zwischen Mitternacht und 6 Uhr morgens), die auf automatisierte
   * oder nicht autorisierte Zugriffe hindeuten können.
   *
   * @private
   * @param {string} userId - ID des zu prüfenden Benutzers
   * @param {string} [ipAddress] - Optionale IP-Adresse des Logins
   * @returns {Promise<void>} Promise ohne Rückgabewert
   *
   * @example
   * ```typescript
   * // Wird intern von checkLoginPatterns aufgerufen
   * await this.checkUnusualLoginTime('user123', '192.168.1.100');
   *
   * // Löst Warnung aus bei Login zwischen 00:00 und 06:00 Uhr
   * ```
   */
  private async checkUnusualLoginTime(userId: string, ipAddress?: string): Promise<void> {
    const hour = new Date().getHours();

    if (hour >= this.UNUSUAL_TIME_START && hour < this.UNUSUAL_TIME_END) {
      await this.reportSuspiciousActivity(
        'unusual_login_time',
        userId,
        {
          loginTime: new Date().toISOString(),
          hour,
          ipAddress,
        },
        ipAddress,
      );
    }
  }

  /**
   * Meldet verdächtige Aktivität
   *
   * Zentrale Methode zum Protokollieren und Melden verdächtiger
   * Aktivitäten. Erstellt Sicherheitslogs, emittiert Events und
   * loggt Warnungen für Monitoring und automatische Reaktionen.
   *
   * @private
   * @param {string} type - Art der verdächtigen Aktivität
   * @param {string} [userId] - Optionale Benutzer-ID
   * @param {Record<string, any>} [metadata] - Zusätzliche Kontextdaten
   * @param {string} [ipAddress] - Optionale IP-Adresse
   * @returns {Promise<void>} Promise ohne Rückgabewert
   * @emits security.suspicious.activity - Event mit Details zur verdächtigen Aktivität
   *
   * @example
   * ```typescript
   * await this.reportSuspiciousActivity(
   *   'brute_force_attempt',
   *   undefined,
   *   {
   *     attemptCount: 15,
   *     timeWindow: '5 minutes'
   *   },
   *   '192.168.1.100'
   * );
   * ```
   */
  private async reportSuspiciousActivity(
    type: string,
    userId?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    await this.securityLogService.logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId,
      ipAddress,
      metadata: {
        type,
        ...metadata,
      },
    });

    this.eventEmitter.emit('security.suspicious.activity', {
      type,
      userId,
      ipAddress,
      metadata,
      timestamp: new Date(),
    });

    this.logger.warn(`Suspicious activity detected: ${type}`, {
      userId,
      ipAddress,
      metadata,
    });
  }
}
