import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { RegistrierePersonHandler } from './commands/registriere-person/registriere-person.handler';
import { RegistrierePersonViaQrCodeHandler } from './commands/registriere-person-qr/registriere-person-qr.handler';
import { WeisePersonZuFahrzeugZuHandler } from './commands/weise-person-zu-fahrzeug/weise-person-zu-fahrzeug.handler';
import { EntfernePersonVonFahrzeugHandler } from './commands/entferne-person-von-fahrzeug/entferne-person-von-fahrzeug.handler';
import { GetEinsatzPersonenHandler } from './queries/get-einsatz-personen/get-einsatz-personen.handler';
import { GetEinsatzPersonByIdHandler } from './queries/get-einsatz-person-by-id/get-einsatz-person-by-id.handler';
import { GetTaktischeStaerkeHandler } from '../queries/get-taktische-staerke/get-taktische-staerke.handler';

/**
 * Application Module fuer EinsatzPersonen.
 *
 * Registriert Command und Query Handlers fuer EinsatzPerson Operations.
 * Importiert PrismaModule und OutboxModule fuer TransactionalCommandHandler.
 *
 * **Story Context:**
 * Story 4-1 (Person manuell registrieren) - Application Layer Module
 * Story 4-2 (Person via QR-Code registrieren) - QR Handler
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
    RegistrierePersonViaQrCodeHandler, // Story 4-2: QR-Code Registrierung
    WeisePersonZuFahrzeugZuHandler,
    EntfernePersonVonFahrzeugHandler,
    // Query Handlers
    GetEinsatzPersonenHandler,
    GetEinsatzPersonByIdHandler,
    GetTaktischeStaerkeHandler, // Story 6.1a: Taktische Stärke-Berechnung
  ],
  exports: [
    RegistrierePersonHandler,
    RegistrierePersonViaQrCodeHandler,
    WeisePersonZuFahrzeugZuHandler,
    EntfernePersonVonFahrzeugHandler,
    GetEinsatzPersonenHandler,
    GetEinsatzPersonByIdHandler,
    GetTaktischeStaerkeHandler,
    LOGGER,
  ],
})
export class EinsatzPersonenApplicationModule {}
