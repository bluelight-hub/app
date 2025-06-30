import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogService, AuditLogBatchService } from './services';
import { AuditLoggerUtil } from './utils';
import { AuditLogInterceptor } from './interceptors';
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * Modul für Audit-Logging-Funktionalitäten
 * Stellt Services für die Erstellung, Abfrage und Verwaltung von Audit-Logs bereit
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [AuditLogService, AuditLogBatchService, AuditLoggerUtil, AuditInterceptor, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogBatchService, AuditLoggerUtil,AuditInterceptor, AuditLogInterceptor],
})
export class AuditModule {}
