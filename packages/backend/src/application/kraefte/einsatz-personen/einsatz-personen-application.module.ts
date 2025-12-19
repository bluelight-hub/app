import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { RegistrierePersonHandler } from './commands/registriere-person/registriere-person.handler';
import { RegistrierePersonViaQrCodeHandler } from './commands/registriere-person-qr/registriere-person-qr.handler';
import { GetEinsatzPersonenHandler } from './queries/get-einsatz-personen/get-einsatz-personen.handler';

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
    // Query Handlers
    GetEinsatzPersonenHandler,
  ],
  exports: [RegistrierePersonHandler, RegistrierePersonViaQrCodeHandler, GetEinsatzPersonenHandler, LOGGER],
})
export class EinsatzPersonenApplicationModule {}
