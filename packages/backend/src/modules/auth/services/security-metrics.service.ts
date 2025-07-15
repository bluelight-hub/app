import { Injectable, Logger } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';
import { SecurityEventType } from '../enums/security-event-type.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Service zur Sammlung und Verwaltung von Sicherheitsmetriken.
 * Stellt aggregierte Daten für Monitoring und Dashboards bereit.
 */
@Injectable()
export class SecurityMetricsService {
  private readonly logger = new Logger(SecurityMetricsService.name);

  constructor(
    private readonly securityLogService: SecurityLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Holt die Metriken für fehlgeschlagene Login-Versuche
   */
  async getFailedLoginMetrics(timeRange: { start: Date; end: Date }) {
    const logs = await this.securityLogService.getSecurityLogs({
      eventType: SecurityEventType.LOGIN_FAILED,
      startDate: timeRange.start,
      endDate: timeRange.end,
    });

    // Group by IP address
    const byIp = new Map<string, number>();
    const byUser = new Map<string, number>();
    const byHour = new Map<string, number>();

    logs.forEach((log) => {
      // Count by IP
      if (log.ipAddress) {
        byIp.set(log.ipAddress, (byIp.get(log.ipAddress) || 0) + 1);
      }

      // Count by user
      if (log.userId) {
        byUser.set(log.userId, (byUser.get(log.userId) || 0) + 1);
      }

      // Count by hour
      const hour = new Date(log.createdAt).toISOString().slice(0, 13);
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    });

    return {
      total: logs.length,
      byIp: Array.from(byIp.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10 IPs
      byUser: Array.from(byUser.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10), // Top 10 users
      byHour: Array.from(byHour.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour.localeCompare(b.hour)),
    };
  }

  /**
   * Holt die Metriken für Account-Sperrungen
   */
  async getAccountLockoutMetrics(timeRange: { start: Date; end: Date }) {
    const logs = await this.securityLogService.getSecurityLogs({
      eventType: SecurityEventType.ACCOUNT_LOCKED,
      startDate: timeRange.start,
      endDate: timeRange.end,
    });

    // Count reasons for lockout
    const byReason = new Map<string, number>();
    const byUser = new Map<string, number>();

    logs.forEach((log) => {
      const metadata = log.metadata as Record<string, any>;
      const reason = metadata?.reason || 'unknown';
      byReason.set(reason, (byReason.get(reason) || 0) + 1);

      if (log.userId) {
        byUser.set(log.userId, (byUser.get(log.userId) || 0) + 1);
      }
    });

    return {
      total: logs.length,
      byReason: Array.from(byReason.entries()).map(([reason, count]) => ({ reason, count })),
      byUser: Array.from(byUser.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Holt die Metriken für verdächtige Aktivitäten
   */
  async getSuspiciousActivityMetrics(timeRange: { start: Date; end: Date }) {
    const logs = await this.securityLogService.getSecurityLogs({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      startDate: timeRange.start,
      endDate: timeRange.end,
    });

    // Group by activity type
    const byType = new Map<string, number>();
    const byIp = new Map<string, number>();

    logs.forEach((log) => {
      const metadata = log.metadata as Record<string, any>;
      const activityType = metadata?.type || 'unknown';
      byType.set(activityType, (byType.get(activityType) || 0) + 1);

      if (log.ipAddress) {
        byIp.set(log.ipAddress, (byIp.get(log.ipAddress) || 0) + 1);
      }
    });

    return {
      total: logs.length,
      byType: Array.from(byType.entries()).map(([type, count]) => ({ type, count })),
      byIp: Array.from(byIp.entries())
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  /**
   * Holt aggregierte Sicherheitsmetriken für Dashboard
   */
  async getDashboardMetrics() {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [failedLogins24h, failedLogins7d, lockouts24h, lockouts7d, suspicious24h, suspicious7d] =
      await Promise.all([
        this.getFailedLoginMetrics({ start: last24Hours, end: now }),
        this.getFailedLoginMetrics({ start: last7Days, end: now }),
        this.getAccountLockoutMetrics({ start: last24Hours, end: now }),
        this.getAccountLockoutMetrics({ start: last7Days, end: now }),
        this.getSuspiciousActivityMetrics({ start: last24Hours, end: now }),
        this.getSuspiciousActivityMetrics({ start: last7Days, end: now }),
      ]);

    return {
      summary: {
        failedLogins: {
          last24Hours: failedLogins24h.total,
          last7Days: failedLogins7d.total,
          trend: this.calculateTrend(failedLogins7d.total, failedLogins24h.total),
        },
        accountLockouts: {
          last24Hours: lockouts24h.total,
          last7Days: lockouts7d.total,
          trend: this.calculateTrend(lockouts7d.total, lockouts24h.total),
        },
        suspiciousActivities: {
          last24Hours: suspicious24h.total,
          last7Days: suspicious7d.total,
          trend: this.calculateTrend(suspicious7d.total, suspicious24h.total),
        },
      },
      details: {
        topFailedLoginIps: failedLogins24h.byIp,
        topLockedUsers: lockouts24h.byUser,
        suspiciousActivityTypes: suspicious24h.byType,
      },
    };
  }

  /**
   * Berechnet den Trend (Änderung in Prozent)
   */
  private calculateTrend(totalPeriod: number, recentPeriod: number): number {
    if (totalPeriod === 0) return 0;
    const averageDaily = totalPeriod / 7;
    if (averageDaily === 0) return 0;
    return Math.round(((recentPeriod - averageDaily) / averageDaily) * 100);
  }

  /**
   * Emittiert Metriken für externes Monitoring (z.B. Prometheus)
   */
  async emitMetrics() {
    const metrics = await this.getDashboardMetrics();

    this.eventEmitter.emit('security.metrics', {
      timestamp: new Date(),
      metrics,
    });

    this.logger.debug('Security metrics emitted');
  }
}
