import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { TaktischeZeichenInfrastructureModule } from '@infrastructure/taktische-zeichen/taktische-zeichen-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { AktualisiereZeichenHandler } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler';
import { TaktischesZeichenResponseFactory } from '@application/taktische-zeichen/factories/taktisches-zeichen-response.factory';
import { ErfasseFahrzeugAusStammdatenHandler } from './commands/erfasse-fahrzeug-aus-stammdaten/erfasse-fahrzeug-aus-stammdaten.handler';
import { ErfasseTemporalesFahrzeugHandler } from './commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler';
import { UpdateFmsStatusHandler } from './commands/update-fms-status/update-fms-status.handler';
import { AssignFahrzeugToEinheitHandler } from './commands/assign-fahrzeug-to-einheit/assign-fahrzeug-to-einheit.handler';
import { GetEinsatzFahrzeugeHandler } from './queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.handler';
import { GetKraeftePoisHandler } from './queries/get-kraefte-pois/get-kraefte-pois.handler';
import { GetFahrzeugZeichenHandler } from './queries/get-fahrzeug-zeichen/get-fahrzeug-zeichen.handler';

/**
 * Application Module für EinsatzFahrzeuge.
 *
 * Registriert Command und Query Handlers für EinsatzFahrzeug Operations.
 * Importiert PrismaModule und OutboxModule für TransactionalCommandHandler.
 *
 * **Story Context:**
 * Story 3-1 (Fahrzeug aus Stammdaten erfassen) - Application Layer Module
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule, TaktischeZeichenInfrastructureModule],
  providers: [
    // Infrastructure Adapters (Cross-cutting concerns)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzFahrzeuge'),
    },
    // Taktische Zeichen Dependencies
    AktualisiereZeichenHandler,
    TaktischesZeichenResponseFactory,
    // Command Handlers
    ErfasseFahrzeugAusStammdatenHandler,
    ErfasseTemporalesFahrzeugHandler,
    UpdateFmsStatusHandler,
    AssignFahrzeugToEinheitHandler,
    // Query Handlers
    GetEinsatzFahrzeugeHandler,
    GetKraeftePoisHandler,
    GetFahrzeugZeichenHandler,
  ],
  exports: [
    // Command Handlers
    ErfasseFahrzeugAusStammdatenHandler,
    ErfasseTemporalesFahrzeugHandler,
    UpdateFmsStatusHandler,
    AssignFahrzeugToEinheitHandler,
    // Query Handlers
    GetEinsatzFahrzeugeHandler,
    GetKraeftePoisHandler,
    GetFahrzeugZeichenHandler,
    // Taktische Zeichen
    AktualisiereZeichenHandler,
    TaktischesZeichenResponseFactory,
    // Logger Token (für Controller)
    LOGGER,
  ],
})
export class EinsatzFahrzeugeApplicationModule {}
