import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { LOGIN_SECURITY, SESSION_CONFIG } from '../constants/auth.constants';

/**
 * Service responsible for cleaning up expired sessions and tokens.
 * Runs scheduled jobs to maintain database hygiene.
 */
@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);
  private readonly idleTimeoutMinutes: number;
  private readonly absoluteTimeoutHours: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Default to 30 minutes idle timeout and 12 hours absolute timeout
    this.idleTimeoutMinutes = this.configService.get<number>('SESSION_IDLE_TIMEOUT_MINUTES', 30);
    this.absoluteTimeoutHours = this.configService.get<number>(
      'SESSION_ABSOLUTE_TIMEOUT_HOURS',
      12,
    );
  }

  /**
   * Clean up expired sessions and tokens every 15 minutes
   */
  @Cron('0 */15 * * * *')
  async cleanupExpiredSessions() {
    this.logger.log('Starting session cleanup job');

    try {
      // Clean up sessions that have expired
      const expiredSessions = await this.prisma.session.deleteMany({
        where: {
          OR: [
            // Sessions past their expiry date
            { expiresAt: { lt: new Date() } },
            // Sessions that have been idle too long
            {
              lastActivityAt: {
                lt: new Date(Date.now() - this.idleTimeoutMinutes * 60 * 1000),
              },
            },
            // Sessions that have reached absolute timeout
            {
              createdAt: {
                lt: new Date(Date.now() - this.absoluteTimeoutHours * 60 * 60 * 1000),
              },
            },
          ],
        },
      });

      if (expiredSessions.count > 0) {
        this.logger.log(`Cleaned up ${expiredSessions.count} expired sessions`);
      }

      // Clean up expired refresh tokens
      const expiredTokens = await this.prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            // Clean up used tokens older than 7 days
            {
              isUsed: true,
              usedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          ],
        },
      });

      if (expiredTokens.count > 0) {
        this.logger.log(`Cleaned up ${expiredTokens.count} expired refresh tokens`);
      }

      // Clean up orphaned refresh tokens (where session no longer exists)
      const orphanedTokens = await this.prisma.$executeRaw`
        DELETE FROM "RefreshToken"
        WHERE "sessionJti" NOT IN (SELECT "jti" FROM "Session")
          AND "sessionJti" IS NOT NULL
      `;

      if (orphanedTokens > 0) {
        this.logger.log(`Cleaned up ${orphanedTokens} orphaned refresh tokens`);
      }
    } catch (error) {
      this.logger.error('Error during session cleanup', error);
    }
  }

  /**
   * Revoke sessions that have been idle for too long (runs every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async revokeIdleSessions() {
    try {
      const idleThreshold = new Date(Date.now() - this.idleTimeoutMinutes * 60 * 1000);

      const revokedSessions = await this.prisma.session.updateMany({
        where: {
          isRevoked: false,
          lastActivityAt: { lt: idleThreshold },
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'Idle timeout',
        },
      });

      if (revokedSessions.count > 0) {
        this.logger.log(`Revoked ${revokedSessions.count} idle sessions`);

        // Also revoke associated refresh tokens
        await this.prisma.refreshToken.updateMany({
          where: {
            sessionJti: {
              in: await this.prisma.session
                .findMany({
                  where: {
                    isRevoked: true,
                    revokedReason: 'Idle timeout',
                    revokedAt: { gte: new Date(Date.now() - 60000) }, // Last minute
                  },
                  select: { jti: true },
                })
                .then((sessions) => sessions.map((s) => s.jti)),
            },
            isRevoked: false,
          },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
          },
        });
      }
    } catch (error) {
      this.logger.error('Error revoking idle sessions', error);
    }
  }

  /**
   * Clean up very old revoked sessions (runs daily at 2 AM)
   */
  @Cron('0 2 * * *')
  async cleanupOldRevokedSessions() {
    this.logger.log('Starting old revoked sessions cleanup');

    try {
      // Delete revoked sessions older than 30 days
      const deletedSessions = await this.prisma.session.deleteMany({
        where: {
          isRevoked: true,
          revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      if (deletedSessions.count > 0) {
        this.logger.log(`Deleted ${deletedSessions.count} old revoked sessions`);
      }

      // Delete revoked refresh tokens older than 30 days
      const deletedTokens = await this.prisma.refreshToken.deleteMany({
        where: {
          isRevoked: true,
          revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      if (deletedTokens.count > 0) {
        this.logger.log(`Deleted ${deletedTokens.count} old revoked tokens`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old revoked sessions', error);
    }
  }

  /**
   * Entfernt überschüssige Sessions eines Benutzers.
   * Behält nur die neuesten N Sessions (definiert durch MAX_SESSIONS_PER_USER).
   */
  async enforceSessionLimit(userId: string): Promise<void> {
    try {
      // Hole alle aktiven Sessions des Benutzers, sortiert nach Erstellungsdatum
      const sessions = await this.prisma.session.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: { jti: true },
      });

      // Wenn mehr Sessions als erlaubt existieren, entferne die ältesten
      if (sessions.length > LOGIN_SECURITY.MAX_SESSIONS_PER_USER) {
        const sessionsToRevoke = sessions.slice(LOGIN_SECURITY.MAX_SESSIONS_PER_USER);
        const jtiList = sessionsToRevoke.map((s) => s.jti);

        // Widerrufe die überschüssigen Sessions
        await this.prisma.session.updateMany({
          where: { jti: { in: jtiList } },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'Session limit exceeded',
          },
        });

        // Widerrufe auch die zugehörigen Refresh Tokens
        await this.prisma.refreshToken.updateMany({
          where: { sessionJti: { in: jtiList } },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
          },
        });

        this.logger.warn(`Revoked ${sessionsToRevoke.length} excess sessions for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to enforce session limit for user ${userId}`, error);
    }
  }

  /**
   * Prüft Rate-Limiting für Refresh-Token-Verwendung.
   * Verhindert zu häufige Token-Refreshes als Sicherheitsmaßnahme.
   */
  async checkRefreshRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: Date }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Zähle Refresh-Token-Verwendungen in der letzten Stunde
      const recentRefreshCount = await this.prisma.refreshToken.count({
        where: {
          userId,
          isUsed: true,
          usedAt: { gte: oneHourAgo },
        },
      });

      if (recentRefreshCount >= SESSION_CONFIG.MAX_REFRESH_ATTEMPTS_PER_HOUR) {
        // Finde den ältesten Refresh in der letzten Stunde
        const oldestRefresh = await this.prisma.refreshToken.findFirst({
          where: {
            userId,
            isUsed: true,
            usedAt: { gte: oneHourAgo },
          },
          orderBy: { usedAt: 'asc' },
          select: { usedAt: true },
        });

        const retryAfter = oldestRefresh
          ? new Date(oldestRefresh.usedAt.getTime() + 60 * 60 * 1000)
          : new Date(Date.now() + 60 * 60 * 1000);

        return { allowed: false, retryAfter };
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error(`Failed to check refresh rate limit for user ${userId}`, error);
      // Im Fehlerfall erlauben wir den Refresh
      return { allowed: true };
    }
  }

  /**
   * Bereinigt alle Sessions und Tokens eines Benutzers.
   * Wird beim Zurücksetzen von Passwörtern oder bei Sicherheitsvorfällen verwendet.
   */
  async revokeAllUserSessions(userId: string, reason: string): Promise<void> {
    try {
      await this.prisma.$transaction([
        // Widerrufe alle Sessions
        this.prisma.session.updateMany({
          where: { userId, isRevoked: false },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: reason,
          },
        }),
        // Widerrufe alle Refresh Tokens
        this.prisma.refreshToken.updateMany({
          where: { userId, isRevoked: false },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
          },
        }),
      ]);

      this.logger.log(`Revoked all sessions for user ${userId}. Reason: ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to revoke sessions for user ${userId}`, error);
      throw error;
    }
  }
}
