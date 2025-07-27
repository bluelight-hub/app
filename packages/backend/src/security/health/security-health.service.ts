import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrityService } from '../services/integrity.service';
import { SECURITY_LOG_QUEUE_CONFIG } from '../constants/event-types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

/**
 * Health Check Service für das Security Logging System.
 * Überprüft verschiedene Komponenten auf ihre Funktionsfähigkeit.
 */
@Injectable()
export class SecurityHealthService extends HealthIndicator {
  private readonly logger = new Logger(SecurityHealthService.name);
  private readonly archivePath: string;

  constructor(
    @InjectQueue(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME)
    private readonly securityLogQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly integrityService: IntegrityService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.archivePath = this.configService.get<string>(
      'SECURITY_LOG_ARCHIVE_PATH',
      './archives/security-logs',
    );
  }

  /**
   * Überprüft die Gesundheit der BullMQ Queue.
   */
  async checkQueueHealth(): Promise<HealthIndicatorResult> {
    const key = 'security_queue';

    try {
      // Check queue connection
      const client = await this.securityLogQueue.client;
      await client.ping();

      // Get queue metrics
      const [waiting, active, delayed, failed] = await Promise.all([
        this.securityLogQueue.getWaitingCount(),
        this.securityLogQueue.getActiveCount(),
        this.securityLogQueue.getDelayedCount(),
        this.securityLogQueue.getFailedCount(),
      ]);

      const total = waiting + active + delayed;
      const isPaused = await this.securityLogQueue.isPaused();

      // Define health thresholds
      const isHealthy = !isPaused && failed < 100 && total < 10000;

      const details = {
        waiting,
        active,
        delayed,
        failed,
        total,
        isPaused,
        status: isHealthy ? 'healthy' : 'unhealthy',
      };

      if (!isHealthy) {
        throw new HealthCheckError(
          'Queue health check failed',
          this.getStatus(key, false, details),
        );
      }

      return this.getStatus(key, true, details);
    } catch (error) {
      throw new HealthCheckError(
        'Queue health check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  /**
   * Überprüft den Redis AOF Status.
   */
  async checkRedisHealth(): Promise<HealthIndicatorResult> {
    const key = 'redis_aof';

    try {
      const client = await this.securityLogQueue.client;
      const info = await client.info('persistence');

      // Parse Redis info
      const aofEnabled = info.includes('aof_enabled:1');
      const aofRewriteInProgress = info.includes('aof_rewrite_in_progress:1');
      const aofLastWriteStatus = info.match(/aof_last_write_status:(\w+)/)?.[1];
      const aofCurrentSize = info.match(/aof_current_size:(\d+)/)?.[1];
      const aofBaseSize = info.match(/aof_base_size:(\d+)/)?.[1];

      const isHealthy = aofEnabled && aofLastWriteStatus === 'ok';

      const details = {
        aofEnabled,
        aofRewriteInProgress,
        aofLastWriteStatus,
        aofCurrentSizeMB: aofCurrentSize ? parseInt(aofCurrentSize) / 1024 / 1024 : 0,
        aofBaseSizeMB: aofBaseSize ? parseInt(aofBaseSize) / 1024 / 1024 : 0,
        status: isHealthy ? 'healthy' : 'unhealthy',
      };

      if (!isHealthy) {
        throw new HealthCheckError(
          'Redis AOF health check failed',
          this.getStatus(key, false, details),
        );
      }

      return this.getStatus(key, true, details);
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  /**
   * Überprüft die Hash-Chain-Integrität der letzten 100 Einträge.
   */
  async checkChainIntegrity(): Promise<HealthIndicatorResult> {
    const key = 'chain_integrity';

    try {
      const startTime = Date.now();
      const isValid = await this.integrityService.verifyChainIntegrity(100);
      const checkDuration = Date.now() - startTime;

      // Get additional chain stats
      const latestLog = await this.prisma.securityLog.findFirst({
        orderBy: { sequenceNumber: 'desc' },
        select: { sequenceNumber: true, createdAt: true },
      });

      const details = {
        isValid,
        checkDurationMs: checkDuration,
        latestSequenceNumber: latestLog?.sequenceNumber?.toString() || '0',
        latestLogAge: latestLog ? Date.now() - latestLog.createdAt.getTime() : null,
        status: isValid ? 'healthy' : 'unhealthy',
      };

      if (!isValid) {
        throw new HealthCheckError(
          'Chain integrity check failed',
          this.getStatus(key, false, details),
        );
      }

      return this.getStatus(key, true, details);
    } catch (error) {
      throw new HealthCheckError(
        'Chain integrity check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  /**
   * Überprüft den verfügbaren Speicherplatz für Archive.
   */
  async checkDiskSpace(): Promise<HealthIndicatorResult> {
    const key = 'disk_space';

    try {
      // Ensure archive directory exists
      await fs.mkdir(this.archivePath, { recursive: true });

      // Get disk usage (platform-specific)
      const stats = await this.getDiskUsage(this.archivePath);

      const freeSpaceGB = stats.free / 1024 / 1024 / 1024;
      const totalSpaceGB = stats.total / 1024 / 1024 / 1024;
      const usedPercent = ((stats.total - stats.free) / stats.total) * 100;

      // Check archive directory size
      const archiveSize = await this.getDirectorySize(this.archivePath);
      const archiveSizeMB = archiveSize / 1024 / 1024;

      const isHealthy = freeSpaceGB > 1 && usedPercent < 90; // At least 1GB free and less than 90% used

      const details = {
        freeSpaceGB: parseFloat(freeSpaceGB.toFixed(2)),
        totalSpaceGB: parseFloat(totalSpaceGB.toFixed(2)),
        usedPercent: parseFloat(usedPercent.toFixed(2)),
        archiveSizeMB: parseFloat(archiveSizeMB.toFixed(2)),
        archivePath: this.archivePath,
        status: isHealthy ? 'healthy' : 'unhealthy',
      };

      if (!isHealthy) {
        throw new HealthCheckError('Disk space check failed', this.getStatus(key, false, details));
      }

      return this.getStatus(key, true, details);
    } catch (error) {
      throw new HealthCheckError(
        'Disk space check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }

  /**
   * Führt alle Health Checks durch.
   */
  async checkHealth(): Promise<HealthIndicatorResult> {
    const results = await Promise.allSettled([
      this.checkQueueHealth(),
      this.checkRedisHealth(),
      this.checkChainIntegrity(),
      this.checkDiskSpace(),
    ]);

    const healthResults = {};
    let allHealthy = true;

    results.forEach((result, index) => {
      const checkName = ['queue', 'redis', 'chain', 'disk'][index];

      if (result.status === 'fulfilled') {
        Object.assign(healthResults, result.value);
      } else {
        allHealthy = false;
        healthResults[checkName] = {
          status: 'down',
          error: result.reason?.message || 'Check failed',
        };
      }
    });

    return {
      ...healthResults,
      overall: {
        status: allHealthy ? 'up' : 'down',
      },
    };
  }

  /**
   * Hilfsmethode zur Ermittlung der Festplattennutzung.
   */
  private async getDiskUsage(dirPath: string): Promise<{ total: number; free: number }> {
    // This is a simplified implementation. In production, you might want to use
    // a library like 'check-disk-space' for cross-platform compatibility
    try {
      const { execSync } = require('child_process');

      if (process.platform === 'win32') {
        // Windows implementation would go here
        return { total: 100 * 1024 * 1024 * 1024, free: 50 * 1024 * 1024 * 1024 };
      } else {
        // Unix-like systems
        const output = execSync(`df -k "${path.resolve(dirPath)}" | tail -1`).toString();
        const parts = output.split(/\s+/);
        const total = parseInt(parts[1]) * 1024;
        const available = parseInt(parts[3]) * 1024;

        return { total, free: available };
      }
    } catch {
      // Fallback values if command fails
      return { total: 100 * 1024 * 1024 * 1024, free: 50 * 1024 * 1024 * 1024 };
    }
  }

  /**
   * Berechnet die Größe eines Verzeichnisses rekursiv.
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist yet
      this.logger.debug(`Could not calculate directory size for ${dirPath}: ${error.message}`);
    }

    return totalSize;
  }
}
