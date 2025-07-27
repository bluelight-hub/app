import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrityService } from '../services/integrity.service';
import { SECURITY_LOG_QUEUE_CONFIG } from '../constants/event-types';
import { logger } from '../../logger/consola.logger';

/**
 * Service für Prometheus-Metriken des Security Logging Systems.
 * Sammelt und exportiert Metriken für Monitoring und Alerting.
 */
@Injectable()
export class SecurityMetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // Queue-Metriken
  private readonly queueSizeGauge: Gauge<string>;
  private readonly queueProcessingTimeHistogram: Histogram<string>;
  private readonly failedJobsCounter: Counter<string>;

  // Chain-Metriken
  private readonly chainIntegrityGauge: Gauge<string>;
  private readonly chainVerificationTimeHistogram: Histogram<string>;

  // API-Metriken
  private readonly apiRequestDurationHistogram: Histogram<string>;
  private readonly apiRequestCounter: Counter<string>;

  // Event-Metriken
  private readonly securityEventCounter: Counter<string>;
  private readonly criticalEventCounter: Counter<string>;

  constructor(
    @InjectQueue(SECURITY_LOG_QUEUE_CONFIG.QUEUE_NAME)
    private readonly securityLogQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly integrityService: IntegrityService,
  ) {
    this.registry = new Registry();

    // Queue-Metriken initialisieren
    this.queueSizeGauge = new Gauge({
      name: 'security_log_queue_size',
      help: 'Current size of the security log queue',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.queueProcessingTimeHistogram = new Histogram({
      name: 'security_log_processing_time_ms',
      help: 'Time taken to process security log events',
      labelNames: ['event_type'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry],
    });

    this.failedJobsCounter = new Counter({
      name: 'security_log_failed_jobs_total',
      help: 'Total number of failed security log jobs',
      labelNames: ['event_type', 'reason'],
      registers: [this.registry],
    });

    // Chain-Integrität Metriken
    this.chainIntegrityGauge = new Gauge({
      name: 'security_log_chain_integrity_status',
      help: 'Status of the security log hash chain integrity (1 = valid, 0 = invalid)',
      registers: [this.registry],
    });

    this.chainVerificationTimeHistogram = new Histogram({
      name: 'security_log_chain_verification_time_ms',
      help: 'Time taken to verify hash chain integrity',
      buckets: [100, 250, 500, 1000, 2500, 5000, 10000],
      registers: [this.registry],
    });

    // API-Metriken
    this.apiRequestDurationHistogram = new Histogram({
      name: 'security_log_api_request_duration_ms',
      help: 'Duration of security log API requests',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [this.registry],
    });

    this.apiRequestCounter = new Counter({
      name: 'security_log_api_requests_total',
      help: 'Total number of security log API requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Event-Metriken
    this.securityEventCounter = new Counter({
      name: 'security_events_total',
      help: 'Total number of security events logged',
      labelNames: ['event_type', 'severity'],
      registers: [this.registry],
    });

    this.criticalEventCounter = new Counter({
      name: 'critical_security_events_total',
      help: 'Total number of critical security events',
      labelNames: ['event_type'],
      registers: [this.registry],
    });
  }

  async onModuleInit() {
    // Starte periodische Metrik-Updates
    this.startMetricsCollection();
  }

  /**
   * Startet die periodische Sammlung von Metriken.
   */
  private startMetricsCollection() {
    // Queue-Metriken alle 5 Sekunden aktualisieren
    setInterval(async () => {
      await this.updateQueueMetrics();
    }, 5000);

    // Chain-Integrität alle 60 Sekunden prüfen
    setInterval(async () => {
      await this.updateChainIntegrityMetrics();
    }, 60000);
  }

  /**
   * Aktualisiert Queue-bezogene Metriken.
   */
  private async updateQueueMetrics() {
    try {
      const [waiting, active, delayed, failed] = await Promise.all([
        this.securityLogQueue.getWaitingCount(),
        this.securityLogQueue.getActiveCount(),
        this.securityLogQueue.getDelayedCount(),
        this.securityLogQueue.getFailedCount(),
      ]);

      this.queueSizeGauge.set({ status: 'waiting' }, waiting);
      this.queueSizeGauge.set({ status: 'active' }, active);
      this.queueSizeGauge.set({ status: 'delayed' }, delayed);
      this.queueSizeGauge.set({ status: 'failed' }, failed);
    } catch (error) {
      logger.error('Failed to update queue metrics:', error);
    }
  }

  /**
   * Aktualisiert Chain-Integritäts-Metriken.
   */
  private async updateChainIntegrityMetrics() {
    const startTime = Date.now();

    try {
      const isValid = await this.integrityService.verifyChainIntegrity(100);
      this.chainIntegrityGauge.set(isValid ? 1 : 0);

      const duration = Date.now() - startTime;
      this.chainVerificationTimeHistogram.observe(duration);
    } catch (error) {
      logger.error('Failed to update chain integrity metrics:', error);
      this.chainIntegrityGauge.set(0);
    }
  }

  /**
   * Erfasst die Verarbeitungszeit eines Security Log Events.
   */
  recordProcessingTime(eventType: string, durationMs: number) {
    this.queueProcessingTimeHistogram.observe({ event_type: eventType }, durationMs);
  }

  /**
   * Erfasst einen fehlgeschlagenen Job.
   */
  recordFailedJob(eventType: string, reason: string) {
    this.failedJobsCounter.inc({ event_type: eventType, reason });
  }

  /**
   * Erfasst eine API-Anfrage.
   */
  recordApiRequest(method: string, route: string, statusCode: number, durationMs: number) {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.apiRequestCounter.inc(labels);
    this.apiRequestDurationHistogram.observe(labels, durationMs);
  }

  /**
   * Erfasst ein Security Event.
   */
  recordSecurityEvent(eventType: string, severity: string = 'INFO') {
    this.securityEventCounter.inc({ event_type: eventType, severity });

    if (severity === 'CRITICAL') {
      this.criticalEventCounter.inc({ event_type: eventType });
    }
  }

  /**
   * Gibt die Registry für den Metrics-Export zurück.
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Gibt alle Metriken im Prometheus-Format zurück.
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Gibt erweiterte Metriken mit zusätzlichen Statistiken zurück.
   */
  async getExtendedMetrics() {
    const [basicMetrics, dbStats, queueStats] = await Promise.all([
      this.getMetrics(),
      this.getDatabaseStats(),
      this.getQueueStats(),
    ]);

    return {
      prometheus: basicMetrics,
      database: dbStats,
      queue: queueStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sammelt Datenbankstatistiken.
   */
  private async getDatabaseStats() {
    try {
      const [totalLogs, last24h, last7d, byEventType] = await Promise.all([
        this.prisma.securityLog.count(),
        this.prisma.securityLog.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.securityLog.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.securityLog.groupBy({
          by: ['eventType'],
          _count: true,
          orderBy: { _count: { eventType: 'desc' } },
          take: 10,
        }),
      ]);

      return {
        totalLogs,
        last24h,
        last7d,
        topEventTypes: byEventType.map((item) => ({
          eventType: item.eventType,
          count: item._count,
        })),
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Sammelt Queue-Statistiken.
   */
  private async getQueueStats() {
    try {
      const [jobs, workers] = await Promise.all([
        this.securityLogQueue.getJobCounts(),
        this.securityLogQueue.getWorkers(),
      ]);

      return {
        jobs,
        workerCount: workers.length,
        isPaused: await this.securityLogQueue.isPaused(),
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      return null;
    }
  }
}
