import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LOGGER, MONITORING } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';
import { MonitoringApplicationModule } from '@application/monitoring/monitoring-application.module';
import { MonitoringGateway } from './gateways/monitoring.gateway';

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
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
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
