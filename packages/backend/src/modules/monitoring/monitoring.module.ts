import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LOGGER, MONITORING } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { MonitoringApplicationModule } from '@application/monitoring/monitoring-application.module';
import { MonitoringGateway } from './gateways/monitoring.gateway';
import { AppConfigService } from '@/infrastructure/services/app-config.service';

/**
 * Monitoring-Modul fuer System-Ueberwachung und Echtzeit-Warnmeldungen.
 *
 * **Features:**
 * - WebSocket Gateway /ws/monitoring fuer Echtzeit-Updates
 * - System-Health Events (system.warnung, system.health_changed)
 * - IMetricsCollector Port-Binding (via MonitoringApplicationModule)
 * - GetSystemHealthQueryHandler fuer /health/system Endpoint
 * - SystemMonitoringScheduler fuer 30s Schwellwert-Checks
 *
 * **Story 5.6 AC2, AC3, AC4**
 *
 * @module MonitoringModule
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        secret: appConfig.get<string>('JWT_SECRET'),
      }),
    }),
    MonitoringApplicationModule,
  ],
  providers: [
    MonitoringGateway,
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('MonitoringModule'),
    },
    {
      provide: MONITORING.GATEWAY,
      useExisting: MonitoringGateway,
    },
  ],
  exports: [MonitoringGateway, MonitoringApplicationModule],
})
export class MonitoringModule {}
