import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters/nest-logger.adapter';

// Command Handlers
import { CreateRollenDefinitionHandler } from '@application/kraefte/rollen/commands';
import { UpdateRollenDefinitionHandler } from '@application/kraefte/rollen/commands';
import { DeactivateRollenDefinitionHandler } from '@application/kraefte/rollen/commands';

// Query Handlers
import { GetAllRollenDefinitionenQueryHandler } from '@application/kraefte/rollen/queries';
import { GetRollenDefinitionByIdQueryHandler } from '@application/kraefte/rollen/queries';

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
