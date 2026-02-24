import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { SystemHealthDto } from '@/application/monitoring/dto/system-health.dto';
import { IMetricsCollector } from '@/application/monitoring/ports/i-metrics-collector.port';
import { MONITORING_TOKENS } from '@/application/monitoring/monitoring-tokens';
import type { GetSystemHealthQuery } from './get-system-health.query';

/**
 * Handler fuer GetSystemHealthQuery.
 *
 * Aggregiert Metriken aus verschiedenen Quellen zu einem
 * einheitlichen SystemHealthDto.
 *
 * **CQRS Query-Side Pattern:**
 * - Read-Only: Aendert niemals Domain State
 * - Aggregation: Sammelt Metriken aus Prometheus, Circuit Breaker, DB
 * - Result<T>: Kein Exception-Throwing fuer vorhersagbare Fehler
 *
 * @remarks Story 5.6 AC2
 */
@Injectable()
export class GetSystemHealthQueryHandler {
  constructor(
    @Inject(MONITORING_TOKENS.METRICS_COLLECTOR)
    private readonly metricsCollector: IMetricsCollector,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Fuehrt die Query aus und aggregiert alle System-Metriken.
   *
   * @param _query - Die Query (parameterlos)
   * @returns Result.ok(SystemHealthDto) bei Erfolg, Result.fail bei Fehler
   */
  async execute(_query: GetSystemHealthQuery): Promise<Result<SystemHealthDto>> {
    try {
      const [zustellrate, websocketConnections, outboxQueueDepth, apiResponseTime, dbConnectionPoolUsage, uptime] = await Promise.all([
        this.metricsCollector.getZustellrate(),
        this.metricsCollector.getWebsocketConnections(),
        this.metricsCollector.getOutboxQueueDepth(),
        this.metricsCollector.getApiResponseTime(),
        this.metricsCollector.getDbConnectionPoolUsage(),
        this.metricsCollector.getUptime(),
      ]);

      // Circuit Breaker Status ueber den Port (framework-agnostisch)
      const circuitBreakerStatuses = this.metricsCollector.getCircuitBreakerStatus();
      const circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'> = {};
      for (const status of circuitBreakerStatuses) {
        circuitBreakerStatus[status.serviceName] = status.state;
      }

      const dto: SystemHealthDto = {
        zustellrate,
        websocketConnections,
        outboxQueueDepth,
        apiResponseTime,
        circuitBreakerStatus,
        dbConnectionPoolUsage,
        uptime,
        timestamp: new Date(),
      };

      return Result.ok(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      this.logger.error(`Fehler beim Abrufen der System-Health: ${message}`, 'GetSystemHealthQueryHandler');
      return Result.fail(`System-Health konnte nicht abgerufen werden: ${message}`);
    }
  }
}
