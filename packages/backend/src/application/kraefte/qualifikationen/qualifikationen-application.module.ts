import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Command Handlers
import { CreateQualifikationHandler } from './commands/create-qualifikation/create-qualifikation.handler';
import { UpdateQualifikationHandler } from './commands/update-qualifikation/update-qualifikation.handler';
import { DeactivateQualifikationHandler } from './commands/deactivate-qualifikation/deactivate-qualifikation.handler';

// Query Handlers
import { GetAllQualifikationenHandler } from './queries/get-all-qualifikationen/get-all-qualifikationen.handler';
import { GetQualifikationByIdHandler } from './queries/get-qualifikation-by-id/get-qualifikation-by-id.handler';

/**
 * Application Module für Qualifikationen-Management.
 *
 * Registriert alle Command und Query Handlers für Qualifikationen.
 * Importiert benötigte Infrastructure Modules.
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Logger für Qualifikationen Handlers
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Qualifikationen'),
    },
    // Command Handlers
    CreateQualifikationHandler,
    UpdateQualifikationHandler,
    DeactivateQualifikationHandler,
    // Query Handlers
    GetAllQualifikationenHandler,
    GetQualifikationByIdHandler,
  ],
  exports: [
    // Export handlers for use in Controller
    CreateQualifikationHandler,
    UpdateQualifikationHandler,
    DeactivateQualifikationHandler,
    GetAllQualifikationenHandler,
    GetQualifikationByIdHandler,
  ],
})
export class QualifikationenApplicationModule {}
