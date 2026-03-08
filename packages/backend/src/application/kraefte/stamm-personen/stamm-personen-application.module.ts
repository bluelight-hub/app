import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Command Handlers
import { CreateStammPersonHandler } from '@application/kraefte/stamm-personen/commands';
import { UpdateStammPersonHandler } from '@application/kraefte/stamm-personen/commands';
import { ArchiveStammPersonHandler } from '@application/kraefte/stamm-personen/commands';
import { RestoreStammPersonHandler } from '@application/kraefte/stamm-personen/commands';

// Query Handlers
import { GetAllStammPersonenHandler } from '@application/kraefte/stamm-personen/queries';
import { GetStammPersonByIdHandler } from '@application/kraefte/stamm-personen/queries';

// Query Mapper
import { StammPersonQueryMapper } from './queries/stamm-person-query.mapper';

/**
 * Application Module für Stamm-Personen-Management.
 *
 * Registriert alle Command und Query Handlers für Stamm-Personen.
 * Importiert benötigte Infrastructure Modules.
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Logger für StammPersonen Handlers
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('StammPersonen'),
    },
    // Command Handlers
    CreateStammPersonHandler,
    UpdateStammPersonHandler,
    ArchiveStammPersonHandler,
    RestoreStammPersonHandler,
    // Query Handlers
    GetAllStammPersonenHandler,
    GetStammPersonByIdHandler,
    // Mapper
    StammPersonQueryMapper,
  ],
  exports: [
    // Export handlers for use in Controller
    CreateStammPersonHandler,
    UpdateStammPersonHandler,
    ArchiveStammPersonHandler,
    RestoreStammPersonHandler,
    GetAllStammPersonenHandler,
    GetStammPersonByIdHandler,
  ],
})
export class StammPersonenApplicationModule {}
