import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { BesetzeRolleHandler } from './commands/besetze-rolle/besetze-rolle.handler';

/**
 * Application Module für RollenBesetzung.
 *
 * Registriert Command und Query Handlers für Rollenbesetzungs-Operationen.
 * Importiert PrismaModule und OutboxModule für TransactionalCommandHandler.
 *
 * **Story Context:**
 * Story 5.1 (Rolle besetzen mit Qualifikationsvalidierung) - Application Layer
 * Story 5.2 (Rolle freigeben) - Geplant für späteren Sprint
 */
@Module({
  imports: [PrismaModule, OutboxModule, KraefteInfrastructureModule],
  providers: [
    // Infrastructure Adapters (Cross-cutting concerns)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('RollenBesetzung'),
    },
    // Command Handlers
    BesetzeRolleHandler,
    // Query Handlers (später: GetRollenBesetzungenHandler)
  ],
  exports: [BesetzeRolleHandler, LOGGER],
})
export class RollenBesetzungApplicationModule {}
