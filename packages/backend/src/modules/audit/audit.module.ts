import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogService } from './services';
import { AuditLoggerUtil } from './utils';
import { AuditLogInterceptor } from './interceptors';
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * Modul für Audit-Logging-Funktionalitäten
 * Stellt Services für die Erstellung, Abfrage und Verwaltung von Audit-Logs bereit
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, AuditLoggerUtil, AuditInterceptor, AuditLogInterceptor],
  exports: [AuditLogService, AuditLoggerUtil,AuditInterceptor, AuditLogInterceptor],
})
export class AuditModule {}
