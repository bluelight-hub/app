import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY, BEFEHL_REPOSITORY, COMPLIANCE_REPORT_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { PrismaBefehlRepository } from '@/infrastructure/repositories/prisma-befehl.repository';
import { PrismaAufbewahrungsKonfigurationRepository } from '@/infrastructure/repositories/prisma-aufbewahrungs-konfiguration.repository';
import { PrismaComplianceReportRepository } from '@/infrastructure/repositories/prisma-compliance-report.repository';
import { UpdateAufbewahrungsKonfigurationHandler } from './commands/update-aufbewahrungs-konfiguration/update-aufbewahrungs-konfiguration.handler';
import { AnonymisiereAbgelaufeneHandler } from './commands/anonymisiere-abgelaufene/anonymisiere-abgelaufene.handler';
import { LoescheAnonymisierteHandler } from './commands/loesche-anonymisierte/loesche-anonymisierte.handler';
import { GetAufbewahrungsKonfigurationQueryHandler } from './queries/get-aufbewahrungs-konfiguration/get-aufbewahrungs-konfiguration.handler';
import { GetAufbewahrungsVorschauQueryHandler } from './queries/get-aufbewahrungs-vorschau/get-aufbewahrungs-vorschau.handler';
import { GetComplianceReportsQueryHandler } from './queries/get-compliance-reports/get-compliance-reports.handler';
import { ComplianceReportService } from './services/compliance-report.service';
import { AufbewahrungsCronService } from './services/aufbewahrungs-cron.service';

/**
 * NestJS-Modul fuer Application Layer — Aufbewahrung Bounded Context.
 *
 * Registriert alle Command-Handler, Query-Handler und Services
 * fuer das DSGVO-Loeschkonzept.
 *
 * **HINWEIS:** Die Repository-Implementations (AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY,
 * COMPLIANCE_REPORT_REPOSITORY) werden im Module Layer (AufbewahrungModule)
 * bereitgestellt, da sie Infrastructure-Implementierungen benoetigen.
 *
 * @remarks Story 5.5
 */
@Module({
  imports: [PrismaModule, OutboxModule],
  providers: [
    // Logger
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Aufbewahrung'),
    },
    // Repositories
    {
      provide: BEFEHL_REPOSITORY,
      useClass: PrismaBefehlRepository,
    },
    {
      provide: AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY,
      useClass: PrismaAufbewahrungsKonfigurationRepository,
    },
    {
      provide: COMPLIANCE_REPORT_REPOSITORY,
      useClass: PrismaComplianceReportRepository,
    },
    // Command Handlers
    UpdateAufbewahrungsKonfigurationHandler,
    AnonymisiereAbgelaufeneHandler,
    LoescheAnonymisierteHandler,
    // Query Handlers
    GetAufbewahrungsKonfigurationQueryHandler,
    GetAufbewahrungsVorschauQueryHandler,
    GetComplianceReportsQueryHandler,
    // Services
    ComplianceReportService,
    AufbewahrungsCronService,
  ],
  exports: [
    // Command Handlers
    UpdateAufbewahrungsKonfigurationHandler,
    AnonymisiereAbgelaufeneHandler,
    LoescheAnonymisierteHandler,
    // Query Handlers
    GetAufbewahrungsKonfigurationQueryHandler,
    GetAufbewahrungsVorschauQueryHandler,
    GetComplianceReportsQueryHandler,
    // Services
    ComplianceReportService,
    AufbewahrungsCronService,
    // Tokens
    BEFEHL_REPOSITORY,
    AUFBEWAHRUNGS_KONFIGURATION_REPOSITORY,
    COMPLIANCE_REPORT_REPOSITORY,
  ],
})
export class AufbewahrungApplicationModule {}
