import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoginAttempt } from '@prisma/generated/prisma';
import { CreateLoginAttemptDto, LoginAttemptStatsDto } from '../dto/login-attempt.dto';
import { AuthConfig } from '../config/auth.config';
import { UAParser } from 'ua-parser-js';
import { isbot } from 'isbot';
import { SecurityAlertService } from './security-alert.service';
import { SecurityLogService } from './security-log.service';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { RuleEngineService } from '../rules/rule-engine.service';
import { RuleContext } from '../rules/rule.interface';

@Injectable()
export class LoginAttemptService {
  private readonly logger = new Logger(LoginAttemptService.name);
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly securityAlertService: SecurityAlertService,
    private readonly securityLogService?: SecurityLogService,
    private readonly suspiciousActivityService?: SuspiciousActivityService,
    @Inject(forwardRef(() => RuleEngineService))
    private readonly ruleEngineService?: RuleEngineService,
  ) {
    this.authConfig = {
      jwt: {
        secret: this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
        accessTokenExpiry: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        refreshTokenExpiry: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
      },
      loginAttempts: {
        maxAttempts: this.configService.get<number>('LOGIN_MAX_ATTEMPTS', 5),
        windowMinutes: this.configService.get<number>('LOGIN_WINDOW_MINUTES', 15),
        lockoutDurationMinutes: this.configService.get<number>('LOGIN_LOCKOUT_MINUTES', 0.167), // Default to 10 seconds
        ipRateLimitAttempts: this.configService.get<number>('IP_RATE_LIMIT_ATTEMPTS', 20),
        ipRateLimitWindowMinutes: this.configService.get<number>('IP_RATE_LIMIT_MINUTES', 60),
      },
      session: {
        inactivityTimeoutMinutes: this.configService.get<number>('SESSION_INACTIVITY_TIMEOUT', 30),
        maxConcurrentSessions: this.configService.get<number>('MAX_CONCURRENT_SESSIONS', 5),
        heartbeatIntervalSeconds: this.configService.get<number>('SESSION_HEARTBEAT_INTERVAL', 30),
      },
      securityAlerts: {
        enabled: this.configService.get<string>('SECURITY_ALERTS_ENABLED', 'false') === 'true',
        webhookUrl: this.configService.get<string>('SECURITY_ALERT_WEBHOOK_URL', null),
        authToken: this.configService.get<string>('SECURITY_ALERT_AUTH_TOKEN', null),
        thresholds: {
          suspiciousLoginRiskScore: 70,
          multipleFailedAttemptsWarning: 3,
        },
      },
    };
  }

  /**
   * Zeichnet einen Login-Versuch auf
   */
  async recordLoginAttempt(data: CreateLoginAttemptDto): Promise<LoginAttempt> {
    try {
      // Parse user agent for device info
      const deviceInfo = this.parseUserAgent(data.userAgent);

      // Calculate risk score
      const riskScore = await this.calculateRiskScore(data);

      // Create login attempt record
      const loginAttempt = await this.prisma.loginAttempt.create({
        data: {
          userId: data.userId,
          email: data.email,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success,
          failureReason: data.failureReason,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          suspicious: riskScore > 70 || deviceInfo.isBot === true,
          riskScore,
          metadata: {
            ...data.metadata,
            botDetected: deviceInfo.isBot,
          },
        },
      });

      this.logger.log(`Login attempt recorded for ${data.email} from ${data.ipAddress}`);

      // Send alert for suspicious login attempts
      if (riskScore > this.authConfig.securityAlerts.thresholds.suspiciousLoginRiskScore) {
        await this.securityAlertService.sendSuspiciousLoginAlert(
          data.email,
          data.userId || null,
          data.ipAddress,
          data.userAgent || '',
          riskScore,
          data.failureReason || 'High risk score detected',
        );
      }

      // Log security event (only if service is available)
      if (this.securityLogService) {
        await this.securityLogService.logSecurityEvent({
          eventType: data.success
            ? SecurityEventType.LOGIN_SUCCESS
            : SecurityEventType.LOGIN_FAILED,
          userId: data.userId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: {
            email: data.email,
            failureReason: data.failureReason,
            suspicious: loginAttempt.suspicious,
            riskScore: loginAttempt.riskScore,
          },
        });
      }

      // Check for suspicious patterns (only if service is available)
      if (this.suspiciousActivityService) {
        // Check for suspicious patterns on failed attempts
        if (!data.success && data.ipAddress) {
          await this.suspiciousActivityService.checkBruteForcePattern(data.ipAddress);
          await this.suspiciousActivityService.checkAccountEnumeration(data.ipAddress);
        }

        // Check for suspicious patterns on successful login
        if (data.success && data.userId) {
          await this.suspiciousActivityService.checkLoginPatterns(data.userId, data.ipAddress);
        }
      }

      // Evaluate threat detection rules (only if service is available)
      if (this.ruleEngineService) {
        await this.evaluateThreatRules({
          userId: data.userId,
          email: data.email,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          success: data.success,
          metadata: {
            ...data.metadata,
            ...deviceInfo,
            riskScore,
            sessionId: (data.metadata as any)?.sessionId,
          },
        });
      }

      return loginAttempt;
    } catch (error) {
      this.logger.error('Failed to record login attempt', error);
      throw error;
    }
  }

  /**
   * Überprüft, ob ein Benutzer gesperrt werden sollte
   */
  async checkAndUpdateLockout(email: string): Promise<{ isLocked: boolean; lockedUntil?: Date }> {
    const windowStart = new Date(
      Date.now() - this.authConfig.loginAttempts.windowMinutes * 60 * 1000,
    );

    // Count recent failed attempts
    const failedAttempts = await this.prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        attemptAt: {
          gte: windowStart,
        },
      },
    });

    if (failedAttempts >= this.authConfig.loginAttempts.maxAttempts) {
      // Lock the account
      const lockedUntil = new Date(
        Date.now() + this.authConfig.loginAttempts.lockoutDurationMinutes * 60 * 1000,
      );

      // Update user if exists
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        await this.prisma.user.update({
          where: { email },
          data: {
            lockedUntil,
            failedLoginCount: failedAttempts,
          },
        });
      }

      this.logger.warn(`Account locked for ${email} until ${lockedUntil}`);

      // Log security event (only if service is available)
      if (user && this.securityLogService) {
        await this.securityLogService.logSecurityEvent({
          eventType: SecurityEventType.ACCOUNT_LOCKED,
          userId: user.id,
          metadata: {
            lockedUntil,
            failedAttempts,
            reason: 'max_attempts',
          },
        });
      }

      // Send account locked alert
      await this.securityAlertService.sendAccountLockedAlert(
        email,
        user?.id || null,
        lockedUntil,
        failedAttempts,
      );

      return { isLocked: true, lockedUntil };
    }

    return { isLocked: false };
  }

  /**
   * Überprüft, ob ein Konto gesperrt ist
   */
  async isAccountLocked(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { lockedUntil: true },
    });

    if (!user || !user.lockedUntil) {
      return false;
    }

    // Check if lockout has expired
    if (user.lockedUntil <= new Date()) {
      // Reset lockout
      await this.prisma.user.update({
        where: { email },
        data: {
          lockedUntil: null,
          failedLoginCount: 0,
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Setzt die fehlgeschlagenen Login-Versuche zurück
   */
  async resetFailedAttempts(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Überprüft IP-basierte Ratenbegrenzung
   */
  async checkIpRateLimit(ipAddress: string): Promise<boolean> {
    // Skip rate limiting for local IPs (emergency service use case)
    if (this.isLocalIp(ipAddress)) {
      this.logger.debug(`Skipping IP rate limit for local IP: ${ipAddress}`);
      return false;
    }

    const windowStart = new Date(
      Date.now() - this.authConfig.loginAttempts.ipRateLimitWindowMinutes * 60 * 1000,
    );

    const attemptCount = await this.prisma.loginAttempt.count({
      where: {
        ipAddress,
        attemptAt: {
          gte: windowStart,
        },
      },
    });

    const isRateLimited = attemptCount >= this.authConfig.loginAttempts.ipRateLimitAttempts;

    // Send brute force alert if rate limit is exceeded
    if (isRateLimited) {
      await this.securityAlertService.sendBruteForceAlert(
        ipAddress,
        attemptCount,
        this.authConfig.loginAttempts.ipRateLimitWindowMinutes,
      );
    }

    return isRateLimited;
  }

  /**
   * Holt Login-Statistiken
   */
  async getLoginStats(
    startDate: Date,
    endDate: Date,
    email?: string,
  ): Promise<LoginAttemptStatsDto> {
    const where = {
      attemptAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(email && { email }),
    };

    const [totalAttempts, successfulAttempts, suspiciousAttempts, uniqueIps, avgRiskScore] =
      await Promise.all([
        this.prisma.loginAttempt.count({ where }),
        this.prisma.loginAttempt.count({ where: { ...where, success: true } }),
        this.prisma.loginAttempt.count({ where: { ...where, suspicious: true } }),
        this.prisma.loginAttempt
          .groupBy({
            by: ['ipAddress'],
            where,
          })
          .then((results) => results.length),
        this.prisma.loginAttempt
          .aggregate({
            where,
            _avg: { riskScore: true },
          })
          .then((result) => result._avg.riskScore || 0),
      ]);

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts: totalAttempts - successfulAttempts,
      uniqueIps,
      suspiciousAttempts,
      averageRiskScore: Math.round(avgRiskScore),
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  /**
   * Holt die letzten Login-Versuche
   */
  async getRecentAttempts(email?: string, limit: number = 10): Promise<LoginAttempt[]> {
    return this.prisma.loginAttempt.findMany({
      where: email ? { email } : undefined,
      orderBy: { attemptAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Berechnet einen Risiko-Score für einen Login-Versuch
   */
  private async calculateRiskScore(data: CreateLoginAttemptDto): Promise<number> {
    let score = 0;

    // Failed attempt adds to risk
    if (!data.success) {
      score += 20;
    }

    // Check for suspicious patterns
    const recentAttempts = await this.prisma.loginAttempt.findMany({
      where: {
        email: data.email,
        attemptAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      orderBy: { attemptAt: 'desc' },
      take: 10,
    });

    // Multiple failed attempts increase risk
    const failedCount = recentAttempts.filter((a) => !a.success).length;
    score += Math.min(failedCount * 10, 30);

    // Different IPs in short time increase risk
    const uniqueIps = new Set(recentAttempts.map((a) => a.ipAddress)).size;
    if (uniqueIps > 3) {
      score += 20;
    }

    // Bot detection using sophisticated analysis
    if (!data.userAgent) {
      score += 15; // No user agent is suspicious
    } else if (isbot(data.userAgent)) {
      score += 25; // Confirmed bot/crawler
    } else {
      // Additional checks for suspicious patterns
      const suspiciousPatterns = [
        /curl|wget|python|java|perl|ruby|go-http|scrapy/i,
        /headless|phantom|puppeteer|playwright/i,
        /bot|spider|crawl|scrape|harvest/i,
      ];

      if (suspiciousPatterns.some((pattern) => pattern.test(data.userAgent))) {
        score += 20;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Parst User-Agent-Informationen
   */
  /**
   * Überprüft mehrere fehlgeschlagene Login-Versuche und sendet ggf. Alert
   */
  async checkMultipleFailedAttempts(
    email: string,
    userId: string,
    failedAttempts: number,
    remainingAttempts: number,
    ipAddress?: string,
  ): Promise<void> {
    if (failedAttempts >= this.authConfig.securityAlerts.thresholds.multipleFailedAttemptsWarning) {
      await this.securityAlertService.sendMultipleFailedAttemptsAlert(
        email,
        userId,
        failedAttempts,
        remainingAttempts,
        ipAddress,
      );
    }
  }

  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    browser?: string;
    os?: string;
    isBot?: boolean;
  } {
    if (!userAgent) {
      return { isBot: true }; // No user agent is suspicious
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Detect bot using isbot library
    const botDetected = isbot(userAgent);

    return {
      deviceType: result.device.type || (botDetected ? 'bot' : 'desktop'),
      browser: result.browser.name || (botDetected ? 'bot' : undefined),
      os: result.os.name,
      isBot: botDetected,
    };
  }

  /**
   * Überprüft, ob eine IP-Adresse lokal ist (für Einsatzumgebungen)
   */
  private isLocalIp(ipAddress: string): boolean {
    // Handle undefined or empty IP
    if (!ipAddress) {
      return false;
    }

    // Common patterns for local IPs
    const localPatterns = [
      /^127\./, // Loopback (127.0.0.1, etc.)
      /^192\.168\./, // Private network class C
      /^10\./, // Private network class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network class B
      /^::1$/, // IPv6 loopback
      /^fe80::/, // IPv6 link-local
      /^fd[0-9a-f]{2}:/, // IPv6 unique local addresses
      /^localhost$/i,
      /^unknown$/i, // Sometimes reported for local connections
    ];

    return localPatterns.some((pattern) => pattern.test(ipAddress));
  }

  /**
   * Evaluiert Threat Detection Rules für einen Login-Versuch
   */
  private async evaluateThreatRules(data: {
    userId?: string;
    email: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Prepare recent events for context
      const lookbackMinutes = 60; // 1 hour lookback
      const recentEvents = await this.getRecentSecurityEvents(
        data.userId,
        data.email,
        data.ipAddress,
        lookbackMinutes,
      );

      // Build rule context
      const context: RuleContext = {
        userId: data.userId,
        email: data.email,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: new Date(),
        eventType: data.success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
        metadata: data.metadata,
        recentEvents,
      };

      // Evaluate rules
      const results = await this.ruleEngineService!.evaluateRules(context);

      // Log evaluation results
      if (results.length > 0) {
        this.logger.warn(`Threat detection rules matched for ${data.email}:`, {
          matchedRules: results.length,
          severities: results.map((r) => r.severity),
        });
      }
    } catch (error) {
      this.logger.error('Failed to evaluate threat detection rules', error);
      // Don't throw - rule evaluation should not break login flow
    }
  }

  /**
   * Holt die letzten Security Events für Rule-Kontext
   */
  private async getRecentSecurityEvents(
    userId: string | undefined,
    email: string | undefined,
    ipAddress: string | undefined,
    lookbackMinutes: number,
  ): Promise<RuleContext['recentEvents']> {
    const cutoffTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);

    // Get recent login attempts
    const recentAttempts = await this.prisma.loginAttempt.findMany({
      where: {
        OR: [{ userId }, { email }, { ipAddress }].filter(Boolean),
        attemptAt: {
          gte: cutoffTime,
        },
      },
      orderBy: { attemptAt: 'desc' },
      take: 100, // Limit to prevent memory issues
    });

    // Convert to rule context format
    return recentAttempts.map((attempt) => ({
      eventType: attempt.success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      timestamp: attempt.attemptAt,
      ipAddress: attempt.ipAddress || undefined,
      success: attempt.success,
      metadata: {
        email: attempt.email,
        userId: attempt.userId,
        deviceType: attempt.deviceType,
        browser: attempt.browser,
        os: attempt.os,
        location: attempt.location,
        riskScore: attempt.riskScore,
        ...((attempt.metadata as any) || {}),
      },
    }));
  }
}
