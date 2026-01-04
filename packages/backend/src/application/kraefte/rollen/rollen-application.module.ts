import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Command Handlers
import { CreateRollenDefinitionHandler } from './commands/create-rollen-definition/create-rollen-definition.handler';
import { UpdateRollenDefinitionHandler } from './commands/update-rollen-definition/update-rollen-definition.handler';
import { DeactivateRollenDefinitionHandler } from './commands/deactivate-rollen-definition/deactivate-rollen-definition.handler';

// Query Handlers
import { GetAllRollenDefinitionenQueryHandler } from './queries/get-all-rollen-definitionen/get-all-rollen-definitionen.handler';
import { GetRollenDefinitionByIdQueryHandler } from './queries/get-rollen-definition-by-id/get-rollen-definition-by-id.handler';

/**
 * Application Module für Rollen-Definitionen-Management.
 *
 * Registriert alle Command und Query Handlers für Rollen-Definitionen.
 * Importiert benötigte Infrastructure Modules.
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Logger für Rollen Handlers
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Rollen'),
    },
    // Command Handlers
    CreateRollenDefinitionHandler,
    UpdateRollenDefinitionHandler,
    DeactivateRollenDefinitionHandler,
    // Query Handlers
    GetAllRollenDefinitionenQueryHandler,
    GetRollenDefinitionByIdQueryHandler,
  ],
  exports: [
    // Export handlers for use in Controller
    CreateRollenDefinitionHandler,
    UpdateRollenDefinitionHandler,
    DeactivateRollenDefinitionHandler,
    GetAllRollenDefinitionenQueryHandler,
    GetRollenDefinitionByIdQueryHandler,
  ],
})
export class RollenApplicationModule {}
