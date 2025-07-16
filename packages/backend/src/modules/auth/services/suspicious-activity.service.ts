import { Injectable, Logger } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Service zur Erkennung verdächtiger Aktivitätsmuster.
 * Analysiert Verhaltensmuster und erkennt potenzielle Sicherheitsrisiken.
 */
@Injectable()
export class SuspiciousActivityService {
  private readonly logger = new Logger(SuspiciousActivityService.name);

  // Schwellenwerte für verdächtige Aktivitäten
  private readonly RAPID_LOGIN_THRESHOLD = 3; // Logins in 1 Minute
  private readonly MULTIPLE_IP_THRESHOLD = 3; // Different IPs in 10 minutes
  private readonly BRUTEFORCE_THRESHOLD = 10; // Failed attempts in 5 minutes
  private readonly UNUSUAL_TIME_START = 0; // 00:00
  private readonly UNUSUAL_TIME_END = 6; // 06:00

  constructor(
    private readonly securityLogService: SecurityLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Überprüft auf verdächtige Login-Muster für einen Benutzer
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
