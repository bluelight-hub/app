import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Command Handlers
import { CreateStammFahrzeugHandler } from '@application/kraefte/stamm-fahrzeuge/commands';
import { UpdateStammFahrzeugHandler } from '@application/kraefte/stamm-fahrzeuge/commands';
import { ArchiveStammFahrzeugHandler } from '@application/kraefte/stamm-fahrzeuge/commands';

// Query Handlers
import { GetAllStammFahrzeugeHandler } from '@application/kraefte/stamm-fahrzeuge/queries';
import { GetStammFahrzeugByIdHandler } from '@application/kraefte/stamm-fahrzeuge/queries';

// Query Mapper
import { StammFahrzeugQueryMapper } from './queries/stamm-fahrzeug-query.mapper';

/**
 * Application Module für Stamm-Fahrzeuge-Management.
 *
 * Registriert alle Command und Query Handlers für Stamm-Fahrzeuge.
 * Importiert benötigte Infrastructure Modules.
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Logger für StammFahrzeuge Handlers
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('StammFahrzeuge'),
    },
    // Command Handlers
    CreateStammFahrzeugHandler,
    UpdateStammFahrzeugHandler,
    ArchiveStammFahrzeugHandler,
    // Query Handlers
    GetAllStammFahrzeugeHandler,
    GetStammFahrzeugByIdHandler,
    // Mapper
    StammFahrzeugQueryMapper,
  ],
  exports: [
    // Export handlers for use in Controller
    CreateStammFahrzeugHandler,
    UpdateStammFahrzeugHandler,
    ArchiveStammFahrzeugHandler,
    GetAllStammFahrzeugeHandler,
    GetStammFahrzeugByIdHandler,
  ],
})
export class StammFahrzeugeApplicationModule {}
