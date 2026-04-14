import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { TaktischeZeichenInfrastructureModule } from '@infrastructure/taktische-zeichen/taktische-zeichen-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { AktualisiereZeichenHandler } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler';
import { TaktischesZeichenResponseFactory } from '@application/taktische-zeichen/factories/taktisches-zeichen-response.factory';
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
import { GetEinheitZeichenHandler } from './queries/get-einheit-zeichen/get-einheit-zeichen.handler';
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
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule, TaktischeZeichenInfrastructureModule],
  providers: [
    // Infrastructure Adapters (Cross-cutting concerns)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzEinheiten'),
    },
    // Taktische Zeichen Dependencies (Issue #667)
    AktualisiereZeichenHandler,
    TaktischesZeichenResponseFactory,
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
    GetEinheitZeichenHandler,
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
    GetEinheitZeichenHandler,
    // Taktische Zeichen (Issue #667)
    AktualisiereZeichenHandler,
    TaktischesZeichenResponseFactory,
    // Logger Token (für Controller)
    LOGGER,
  ],
})
export class EinsatzEinheitenApplicationModule {}
