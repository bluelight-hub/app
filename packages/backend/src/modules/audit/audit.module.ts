import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogService, AuditLogBatchService, AuditLogSchedulerService } from './services';
import { AuditLoggerUtil } from './utils';
import { AuditLogController } from './controllers';
import { AuditLogInterceptor } from './interceptors';
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * Modul für Audit-Logging-Funktionalitäten
 * Stellt Services für die Erstellung, Abfrage und Verwaltung von Audit-Logs bereit
 */
@Module({
  imports: [PrismaModule, ConfigModule, ScheduleModule],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditLogBatchService,
    AuditLogSchedulerService,
    AuditLoggerUtil,
    AuditLogInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    AuditInterceptor,
  ],
  exports: [
    AuditLogService,
    AuditLogBatchService,
    AuditLoggerUtil,
    AuditInterceptor,
    AuditLogInterceptor,
  ],
})
export class AuditModule {}
