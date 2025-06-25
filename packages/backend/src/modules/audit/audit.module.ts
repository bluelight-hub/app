import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogService } from './services';
import { AuditLoggerUtil } from './utils';

/**
 * Modul für Audit-Logging-Funktionalitäten
 * Stellt Services für die Erstellung, Abfrage und Verwaltung von Audit-Logs bereit
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditLogService, AuditLoggerUtil],
  exports: [AuditLogService, AuditLoggerUtil],
})
export class AuditModule {}
