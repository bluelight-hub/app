import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../modules/audit/audit.module';
import { ErrorHandlingService } from './services/error-handling.service';
import { PaginationService } from './services/pagination.service';

/**
 * Modul für gemeinsam genutzte Funktionalitäten wie Paginierung, Validierung, Audit-Logging, etc.
 */
@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  providers: [PaginationService, ErrorHandlingService],
  exports: [PaginationService, ErrorHandlingService, AuditModule],
})
export class CommonModule {}
