import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { ErfasseFahrzeugAusStammdatenHandler } from './commands/erfasse-fahrzeug-aus-stammdaten/erfasse-fahrzeug-aus-stammdaten.handler';
import { ErfasseTemporalesFahrzeugHandler } from './commands/erfasse-temporales-fahrzeug/erfasse-temporales-fahrzeug.handler';
import { UpdateFmsStatusHandler } from './commands/update-fms-status/update-fms-status.handler';
import { GetEinsatzFahrzeugeHandler } from './queries/get-einsatz-fahrzeuge/get-einsatz-fahrzeuge.handler';

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
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [ErfasseFahrzeugAusStammdatenHandler, ErfasseTemporalesFahrzeugHandler, UpdateFmsStatusHandler, GetEinsatzFahrzeugeHandler],
  exports: [ErfasseFahrzeugAusStammdatenHandler, ErfasseTemporalesFahrzeugHandler, UpdateFmsStatusHandler, GetEinsatzFahrzeugeHandler],
})
export class EinsatzFahrzeugeApplicationModule {}
