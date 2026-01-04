import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Command Handlers
import { CreateStammPersonHandler } from './commands/create-stamm-person/create-stamm-person.handler';
import { UpdateStammPersonHandler } from './commands/update-stamm-person/update-stamm-person.handler';
import { ArchiveStammPersonHandler } from './commands/archive-stamm-person/archive-stamm-person.handler';
import { RestoreStammPersonHandler } from './commands/restore-stamm-person/restore-stamm-person.handler';

// Query Handlers
import { GetAllStammPersonenHandler } from './queries/get-all-stamm-personen/get-all-stamm-personen.handler';
import { GetStammPersonByIdHandler } from './queries/get-stamm-person-by-id/get-stamm-person-by-id.handler';

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
