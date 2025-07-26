import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { ArchiveService } from './archive.service';

/**
 * Service zur Verwaltung der Security Log Retention und automatischen Bereinigung.
 *
 * WARNING: Deletion breaks hash chain integrity!
 * Consider archiving before deletion for compliance.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly retentionDays: number;
  private readonly cleanupEnabled: boolean;
  private readonly batchSize: number;
  private readonly cleanupCron: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly archiveService: ArchiveService,
  ) {
    this.retentionDays = this.configService.get<number>('SECURITY_LOG_RETENTION_DAYS', 90);
    this.cleanupEnabled = this.configService.get<boolean>('SECURITY_LOG_CLEANUP_ENABLED', true);
    this.batchSize = this.configService.get<number>('SECURITY_LOG_CLEANUP_BATCH_SIZE', 10000);
    this.cleanupCron = this.configService.get<string>('SECURITY_LOG_CLEANUP_CRON', '0 2 * * *');
  }

  /**
   * Geplanter Cleanup-Job für alte Security Logs.
   * Läuft täglich um 2 Uhr morgens (konfigurierbar).
   */
  @Cron(process.env.SECURITY_LOG_CLEANUP_CRON || '0 2 * * *')
  async handleCleanup(): Promise<void> {
    if (!this.cleanupEnabled) {
      this.logger.debug('Security log cleanup is disabled');
      return;
    }

    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    this.logger.log(
      `Starting security log cleanup for logs older than ${cutoffDate.toISOString()}`,
    );

    try {
      // Optional: Archive before deletion
      const shouldArchive = this.configService.get<boolean>(
        'SECURITY_LOG_ARCHIVE_BEFORE_DELETE',
        true,
      );
      if (shouldArchive) {
        this.logger.log('Archiving logs before deletion...');
        await this.archiveService.archiveBeforeDate(cutoffDate);
      }

      // Delete in batches
      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        const deletedCount = await this.deleteOldLogsBatch(cutoffDate);
        totalDeleted += deletedCount;
        hasMore = deletedCount === this.batchSize;

        if (hasMore) {
          // Small delay between batches to prevent database overload
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Security log cleanup completed: ${totalDeleted} logs deleted in ${duration}ms`,
      );

      // Log cleanup statistics
      await this.logCleanupStatistics(totalDeleted, duration, cutoffDate);
    } catch (error) {
      this.logger.error(`Security log cleanup failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Löscht alte Logs in Batches.
   *
   * @param cutoffDate - Datum vor dem Logs gelöscht werden
   * @returns Anzahl der gelöschten Logs
   */
  private async deleteOldLogsBatch(cutoffDate: Date): Promise<number> {
    // WARNING: Deletion breaks hash chain integrity!
    // Consider archiving before deletion for compliance.

    // First, get the IDs of logs to delete (to work around Prisma limitations)
    const logsToDelete = await this.prisma.securityLog.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
      },
      take: this.batchSize,
    });

    if (logsToDelete.length === 0) {
      return 0;
    }

    // Delete the logs
    const deleteResult = await this.prisma.securityLog.deleteMany({
      where: {
        id: {
          in: logsToDelete.map((log) => log.id),
        },
      },
    });

    return deleteResult.count;
  }

  /**
   * Loggt Cleanup-Statistiken für Monitoring.
   *
   * @param deletedCount - Anzahl der gelöschten Logs
   * @param duration - Dauer des Cleanup-Vorgangs in Millisekunden
   * @param cutoffDate - Verwendetes Cutoff-Datum
   */
  private async logCleanupStatistics(
    deletedCount: number,
    duration: number,
    cutoffDate: Date,
  ): Promise<void> {
    try {
      // Get current log count for statistics
      const currentCount = await this.prisma.securityLog.count();

      // Log as security event
      const metadata = {
        deletedCount,
        duration,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: this.retentionDays,
        remainingLogs: currentCount,
        batchSize: this.batchSize,
      };

      this.logger.log('Cleanup statistics:', metadata);
    } catch (error) {
      this.logger.error('Failed to log cleanup statistics:', error);
    }
  }

  /**
   * Manueller Cleanup-Trigger für Administratoren.
   *
   * @param retentionDays - Optionale Überschreibung der Retention-Tage
   * @returns Cleanup-Ergebnis
   */
  async triggerManualCleanup(retentionDays?: number): Promise<{
    deletedCount: number;
    duration: number;
    cutoffDate: Date;
  }> {
    const startTime = Date.now();
    const effectiveRetentionDays = retentionDays || this.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - effectiveRetentionDays);

    this.logger.log(`Manual cleanup triggered for logs older than ${cutoffDate.toISOString()}`);

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const deletedCount = await this.deleteOldLogsBatch(cutoffDate);
      totalDeleted += deletedCount;
      hasMore = deletedCount === this.batchSize;

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const duration = Date.now() - startTime;

    return {
      deletedCount: totalDeleted,
      duration,
      cutoffDate,
    };
  }

  /**
   * Prüft ob Cleanup aktiviert ist.
   */
  isCleanupEnabled(): boolean {
    return this.cleanupEnabled;
  }

  /**
   * Gibt die aktuelle Retention-Konfiguration zurück.
   */
  getRetentionConfig(): {
    retentionDays: number;
    cleanupEnabled: boolean;
    batchSize: number;
    cleanupCron: string;
  } {
    return {
      retentionDays: this.retentionDays,
      cleanupEnabled: this.cleanupEnabled,
      batchSize: this.batchSize,
      cleanupCron: this.cleanupCron,
    };
  }
}
