import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { RegistrierePersonHandler } from './commands/registriere-person/registriere-person.handler';
import { GetEinsatzPersonenHandler } from './queries/get-einsatz-personen/get-einsatz-personen.handler';

/**
 * Application Module für EinsatzPersonen.
 *
 * Registriert Command und Query Handlers für EinsatzPerson Operations.
 * Importiert PrismaModule und OutboxModule für TransactionalCommandHandler.
 *
 * **Story Context:**
 * Story 4-1 (Person manuell registrieren) - Application Layer Module
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Infrastructure Adapters (Cross-cutting concerns)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzPersonen'),
    },
    // Command Handlers
    RegistrierePersonHandler,
    // Query Handlers
    GetEinsatzPersonenHandler,
  ],
  exports: [RegistrierePersonHandler, GetEinsatzPersonenHandler],
})
export class EinsatzPersonenApplicationModule {}
