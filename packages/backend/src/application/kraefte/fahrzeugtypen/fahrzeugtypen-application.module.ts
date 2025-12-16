import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';

// Command Handlers
import { CreateFahrzeugtypHandler } from './commands/create-fahrzeugtyp/create-fahrzeugtyp.handler';
import { UpdateFahrzeugtypHandler } from './commands/update-fahrzeugtyp/update-fahrzeugtyp.handler';
import { DeactivateFahrzeugtypHandler } from './commands/deactivate-fahrzeugtyp/deactivate-fahrzeugtyp.handler';

// Query Handlers
import { GetAllFahrzeugtypenHandler } from './queries/get-all-fahrzeugtypen/get-all-fahrzeugtypen.handler';
import { GetFahrzeugtypByIdHandler } from './queries/get-fahrzeugtyp-by-id/get-fahrzeugtyp-by-id.handler';

/**
 * Application Module für Fahrzeugtypen-Management.
 *
 * Registriert alle Command und Query Handlers für Fahrzeugtypen.
 * Importiert benötigte Infrastructure Modules.
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Command Handlers
    CreateFahrzeugtypHandler,
    UpdateFahrzeugtypHandler,
    DeactivateFahrzeugtypHandler,
    // Query Handlers
    GetAllFahrzeugtypenHandler,
    GetFahrzeugtypByIdHandler,
  ],
  exports: [
    // Export handlers for use in Controller
    CreateFahrzeugtypHandler,
    UpdateFahrzeugtypHandler,
    DeactivateFahrzeugtypHandler,
    GetAllFahrzeugtypenHandler,
    GetFahrzeugtypByIdHandler,
  ],
})
export class FahrzeugtypenApplicationModule {}
