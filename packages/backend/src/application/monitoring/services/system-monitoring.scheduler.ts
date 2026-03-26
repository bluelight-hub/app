import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { WarnungTyp } from '@domain/value-objects/warnung-typ';
import { SystemWarnungEvent } from '@domain/events/system-warnung.event';
import { IMetricsCollector } from '@/application/monitoring/ports/i-metrics-collector.port';
import { MONITORING_TOKENS } from '@/application/monitoring/monitoring-tokens';
import { DEFAULT_SCHWELLWERT_CONFIG, type SchwellwertConfig } from '@/application/monitoring/dto/schwellwert-config';

/**
 * Scheduler fuer periodische System-Monitoring-Checks.
 *
 * Prüft alle 30 Sekunden Schwellwerte und emittiert
 * SystemWarnungEvents bei Ueberschreitungen.
 *
 * **Pattern:**
 * - @Interval(30_000): Periodische Ausführung
 * - EventEmitter2: Event-basierte Kommunikation (fire-and-forget)
 * - Circuit Breaker Status: Prüft OPEN-Zustaende über IMetricsCollector Port
 *
 * @remarks Story 5.6 AC3, AC5
 */
@Injectable()
export class SystemMonitoringScheduler {
  private readonly config: SchwellwertConfig;
  private isRunning = false;

  constructor(
    @Inject(MONITORING_TOKENS.METRICS_COLLECTOR)
    private readonly metricsCollector: IMetricsCollector,
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    this.config = DEFAULT_SCHWELLWERT_CONFIG;
  }

  /**
   * Periodischer Check alle 30 Sekunden.
   *
   * Prüft Schwellwerte und emittiert Events bei Ueberschreitungen.
   * Running-Guard verhindert parallele Ausführung.
   */
  @Interval('system-monitoring-check', 30_000)
  async checkSchwellwerte(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Monitoring-Check laeuft bereits, ueberspringe', 'SystemMonitoringScheduler');
      return;
    }

    this.isRunning = true;
    try {
      await this.checkZustellrate();
      await this.checkOutboxQueueDepth();
      await this.checkLatenz();
      this.checkCircuitBreakers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannt';
      this.logger.error(`Monitoring-Check fehlgeschlagen: ${message}`, 'SystemMonitoringScheduler');
    } finally {
      this.isRunning = false;
    }
  }

  /** Prüft ob die Zustellrate unter dem Schwellwert liegt */
  private async checkZustellrate(): Promise<void> {
    const zustellrate = await this.metricsCollector.getZustellrate();
    if (zustellrate < this.config.zustellrateMin) {
      this.emitWarnung(WarnungTyp.ZUSTELLRATE, this.config.zustellrateMin, zustellrate);
    }
  }

  /** Prüft ob die Outbox-Queue-Tiefe den Schwellwert überschreitet */
  private async checkOutboxQueueDepth(): Promise<void> {
    const depth = await this.metricsCollector.getOutboxQueueDepth();
    if (depth > this.config.outboxQueueDepthMax) {
      this.emitWarnung(WarnungTyp.OUTBOX_STAU, this.config.outboxQueueDepthMax, depth);
    }
  }

  /** Prüft ob die API-Latenz (p95) den Schwellwert überschreitet */
  private async checkLatenz(): Promise<void> {
    const responseTime = await this.metricsCollector.getApiResponseTime();
    if (responseTime.p95 > this.config.latenzP95Max) {
      this.emitWarnung(WarnungTyp.LATENZ, this.config.latenzP95Max, responseTime.p95);
    }
  }

  /** Prüft ob ein Circuit Breaker OPEN oder HALF_OPEN ist */
  private checkCircuitBreakers(): void {
    const statuses = this.metricsCollector.getCircuitBreakerStatus();
    for (const status of statuses) {
      if (status.state === 'OPEN') {
        this.emitWarnung(WarnungTyp.CIRCUIT_BREAKER, 0, 1);
        this.logger.warn(`Circuit Breaker OPEN: ${status.serviceName}`, 'SystemMonitoringScheduler');
      } else if (status.state === 'HALF_OPEN') {
        this.logger.warn(`Circuit Breaker HALF_OPEN: ${status.serviceName} (instabiler Zustand)`, 'SystemMonitoringScheduler');
      }
    }
  }

  /** Emittiert ein SystemWarnungEvent */
  private emitWarnung(typ: WarnungTyp, schwellwert: number, aktuellerWert: number): void {
    const event = new SystemWarnungEvent(typ, schwellwert, aktuellerWert, new Date());
    this.eventEmitter.emit(SystemWarnungEvent.eventName(), event);
    this.logger.warn(`System-Warnung: ${typ} — Schwellwert: ${schwellwert}, Aktuell: ${aktuellerWert}`, 'SystemMonitoringScheduler');
  }
}
