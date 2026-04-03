import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { CreateEinheitHandler } from './commands/create-einheit/create-einheit.handler';
import { UpdateEinheitHandler } from './commands/update-einheit/update-einheit.handler';
import { ChangeEinheitStatusHandler } from './commands/change-einheit-status/change-einheit-status.handler';
import { SetEinheitenfuehrerHandler } from './commands/set-einheitenfuehrer/set-einheitenfuehrer.handler';
import { AssignPersonToEinheitHandler } from './commands/assign-person-to-einheit/assign-person-to-einheit.handler';
import { RemovePersonFromEinheitHandler } from './commands/remove-person-from-einheit/remove-person-from-einheit.handler';
import { MoveEinheitHandler } from './commands/move-einheit/move-einheit.handler';
import { DeleteEinheitHandler } from './commands/delete-einheit/delete-einheit.handler';
import { GetEinsatzEinheitenHandler } from './queries/get-einsatz-einheiten/get-einsatz-einheiten.handler';
import { GetEinheitDetailsHandler } from './queries/get-einheit-details/get-einheit-details.handler';

/**
 * Application Module für EinsatzEinheiten.
 *
 * Registriert Command und Query Handlers für taktische Einheiten.
 * Importiert PrismaModule und OutboxModule für TransactionalCommandHandler.
 *
 * **Issue #411 Context:**
 * Taktische Einheiten - Application Layer Module
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Infrastructure Adapters (Cross-cutting concerns)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzEinheiten'),
    },
    // Command Handlers
    CreateEinheitHandler,
    UpdateEinheitHandler,
    ChangeEinheitStatusHandler,
    SetEinheitenfuehrerHandler,
    AssignPersonToEinheitHandler,
    RemovePersonFromEinheitHandler,
    MoveEinheitHandler,
    DeleteEinheitHandler,
    // Query Handlers
    GetEinsatzEinheitenHandler,
    GetEinheitDetailsHandler,
  ],
  exports: [
    // Command Handlers
    CreateEinheitHandler,
    UpdateEinheitHandler,
    ChangeEinheitStatusHandler,
    SetEinheitenfuehrerHandler,
    AssignPersonToEinheitHandler,
    RemovePersonFromEinheitHandler,
    MoveEinheitHandler,
    DeleteEinheitHandler,
    // Query Handlers
    GetEinsatzEinheitenHandler,
    GetEinheitDetailsHandler,
    // Logger Token (für Controller)
    LOGGER,
  ],
})
export class EinsatzEinheitenApplicationModule {}
