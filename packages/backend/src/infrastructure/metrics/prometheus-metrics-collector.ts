/**
 * Prometheus Metrics Collector - Infrastructure Layer Implementation.
 *
 * Implementiert den IMetricsCollector Port aus dem Application Layer
 * und liest Metriken direkt aus prom-client Prometheus Registern.
 *
 * **Hexagonale Architektur:**
 * - Port: IMetricsCollector (Application Layer)
 * - Adapter: PrometheusMetricsCollector (Infrastructure Layer)
 *
 * @remarks Story 5.6 AC2
 * @module infrastructure/metrics
 */
import { Inject, Injectable } from '@nestjs/common';
import type { Gauge, Histogram, Registry } from 'prom-client';
import { METRICS, RESILIENCE } from '@infrastructure/di-tokens';
import type { IMetricsCollector, CircuitBreakerStatusInfo } from '@application/monitoring/ports/i-metrics-collector.port';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

@Injectable()
export class PrometheusMetricsCollector implements IMetricsCollector {
  constructor(
    @Inject(METRICS.REGISTRY) private readonly registry: Registry,
    @Inject(METRICS.HTTP_REQUEST_DURATION) private readonly httpDuration: Histogram<string>,
    @Inject(METRICS.WS_CONNECTIONS) private readonly wsConnections: Gauge<string>,
    @Inject(METRICS.OUTBOX_QUEUE_DEPTH) private readonly outboxDepth: Gauge<string>,
    private readonly prisma: PrismaService,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Berechnet die Zustellrate der letzten 5 Minuten.
   *
   * Zustellrate = (quittierte Befehle / gesendete Befehle) * 100
   * Falls keine Befehle vorhanden: 100% (alles OK).
   */
  async getZustellrate(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [total, quittiert] = await Promise.all([
      this.prisma.befehl.count({
        where: { erteiltAm: { gte: fiveMinutesAgo } },
      }),
      this.prisma.befehl.count({
        where: {
          erteiltAm: { gte: fiveMinutesAgo },
          status: 'QUITTIERT',
        },
      }),
    ]);

    if (total === 0) return 100;
    return Math.round((quittiert / total) * 10000) / 100; // 2 Dezimalstellen
  }

  /**
   * Liest die aktuelle Anzahl aktiver WebSocket-Verbindungen aus der Gauge.
   */
  async getWebsocketConnections(): Promise<number> {
    const metric = await this.wsConnections.get();
    let total = 0;
    for (const value of metric.values) {
      total += value.value;
    }
    return total;
  }

  /**
   * Liest die aktuelle Outbox Queue Depth aus der Gauge.
   *
   * Falls Gauge noch nicht gesetzt: Zaehlt direkt aus der DB.
   */
  async getOutboxQueueDepth(): Promise<number> {
    const metric = await this.outboxDepth.get();
    const firstValue = metric.values[0];
    if (firstValue && firstValue.value > 0) {
      return firstValue.value;
    }

    // Fallback: direkt aus DB zaehlen
    return this.prisma.outboxEvent.count({
      where: { status: 'PENDING' },
    });
  }

  /**
   * Aggregiert API Response Times aus dem Prometheus Histogram.
   *
   * Berechnet p50, p95, p99 aus den Histogram-Buckets.
   */
  async getApiResponseTime(): Promise<{ p50: number; p95: number; p99: number }> {
    const metric = await this.httpDuration.get();

    // Histogram-Werte aus Buckets extrahieren
    const buckets: Array<{ le: number; count: number }> = [];
    let totalCount = 0;

    for (const value of metric.values) {
      if (value.metricName?.endsWith('_bucket') && value.labels.le !== undefined) {
        const le = Number(value.labels.le);
        if (Number.isFinite(le)) {
          buckets.push({ le, count: value.value });
        }
      }
      if (value.metricName?.endsWith('_count')) {
        totalCount += value.value;
      }
    }

    if (totalCount === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    // Buckets sortieren
    buckets.sort((a, b) => a.le - b.le);

    return {
      p50: this.calculatePercentile(buckets, totalCount, 0.5) * 1000, // s → ms
      p95: this.calculatePercentile(buckets, totalCount, 0.95) * 1000,
      p99: this.calculatePercentile(buckets, totalCount, 0.99) * 1000,
    };
  }

  /**
   * Schaetzt die DB-Connection-Pool-Auslastung.
   *
   * Prisma nutzt einen Connection Pool - wir testen ob eine Query
   * schnell durchgeht als Proxy fuer Pool-Auslastung.
   */
  async getDbConnectionPoolUsage(): Promise<number> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const elapsed = Date.now() - start;

      // Heuristik: >100ms Antwortzeit deutet auf Pool-Engpass hin
      if (elapsed < 5) return 10;
      if (elapsed < 20) return 30;
      if (elapsed < 50) return 50;
      if (elapsed < 100) return 70;
      return 90;
    } catch {
      return 100; // DB nicht erreichbar = 100% ausgelastet
    }
  }

  /** Liest die Server-Uptime in Sekunden. */
  async getUptime(): Promise<number> {
    return Math.floor(process.uptime());
  }

  /** Liest den Circuit Breaker Status aller Integrationen. */
  getCircuitBreakerStatus(): CircuitBreakerStatusInfo[] {
    return this.circuitBreaker.getAllStatus().map((s) => ({
      serviceName: s.serviceName,
      state: s.state,
    }));
  }

  /**
   * Berechnet ein Perzentil aus Histogram-Buckets (lineare Interpolation).
   */
  private calculatePercentile(buckets: Array<{ le: number; count: number }>, totalCount: number, percentile: number): number {
    const target = totalCount * percentile;

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i]!;
      if (bucket.count >= target) {
        if (i === 0) return bucket.le;
        // Lineare Interpolation
        const prev = buckets[i - 1]!;
        const ratio = (target - prev.count) / (bucket.count - prev.count);
        return prev.le + ratio * (bucket.le - prev.le);
      }
    }

    return buckets[buckets.length - 1]?.le ?? 0;
  }
}
