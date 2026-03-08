import { Module } from '@nestjs/common';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { PrometheusMetricsCollector } from '@infrastructure/metrics/prometheus-metrics-collector';
import { ResilienceModule } from '@infrastructure/resilience/resilience.module';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { MONITORING_TOKENS } from './monitoring-tokens';
import { GetSystemHealthQueryHandler } from '@application/monitoring/queries/get-system-health';
import { SystemMonitoringScheduler } from './services/system-monitoring.scheduler';

/**
 * Application Module fuer System-Monitoring.
 *
 * Stellt Query Handlers und Monitoring Scheduler bereit.
 * Registriert IMetricsCollector Port-Binding (Hexagonale Architektur).
 *
 * @remarks Story 5.6
 */
@Module({
  imports: [PrismaModule, ResilienceModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Monitoring'),
    },
    {
      provide: MONITORING_TOKENS.METRICS_COLLECTOR,
      useClass: PrometheusMetricsCollector,
    },
    GetSystemHealthQueryHandler,
    SystemMonitoringScheduler,
  ],
  exports: [GetSystemHealthQueryHandler, SystemMonitoringScheduler, MONITORING_TOKENS.METRICS_COLLECTOR],
})
export class MonitoringApplicationModule {}
