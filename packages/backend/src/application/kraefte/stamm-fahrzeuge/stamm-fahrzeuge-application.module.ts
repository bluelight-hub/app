import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';

// Command Handlers
import { CreateStammFahrzeugHandler } from './commands/create-stamm-fahrzeug/create-stamm-fahrzeug.handler';
import { UpdateStammFahrzeugHandler } from './commands/update-stamm-fahrzeug/update-stamm-fahrzeug.handler';
import { ArchiveStammFahrzeugHandler } from './commands/archive-stamm-fahrzeug/archive-stamm-fahrzeug.handler';

// Query Handlers
import { GetAllStammFahrzeugeHandler } from './queries/get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.handler';
import { GetStammFahrzeugByIdHandler } from './queries/get-stamm-fahrzeug-by-id/get-stamm-fahrzeug-by-id.handler';

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
