import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { ErrorHandlingService } from './services/error-handling.service';
import { PaginationService } from './services/pagination.service';

/**
 * Gemeinsames Modul für anwendungsübergreifende Funktionalitäten
 *
 * Dieses Modul bündelt wiederverwendbare Services und Utilities,
 * die von mehreren anderen Modulen genutzt werden. Dazu gehören:
 * - Paginierung für Datenbankabfragen
 * - Fehlerbehandlung mit Retry-Logik
 * - Audit-Logging-Funktionalität
 *
 * @module CommonModule
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PaginationService, ErrorHandlingService],
  exports: [PaginationService, ErrorHandlingService],
})
export class CommonModule {}
