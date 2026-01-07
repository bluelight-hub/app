import { Module } from '@nestjs/common';

import { CompleteSetupHandler } from '@/application/admin/commands';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';

import { AdminSetupController } from './controllers/admin-setup.controller';

/**
 * Admin-Modul fuer Server-Setup und Administration.
 *
 * Stellt den `/admin/setup` Endpoint bereit, der beim initialen
 * Server-Setup verwendet wird um den ersten Admin-User und
 * Server-Access-Token zu erstellen.
 *
 * **Imports:**
 * - `PrismaModule`: Datenbankzugriff
 * - `ServerAccessTokenInfrastructureModule`: Token-Repository (Story 1.1)
 * - `UserInfrastructureModule`: User-Repository
 * - `OutboxModule`: Transactional Outbox Pattern (exportiert OUTBOX_REPOSITORY)
 *
 * **Providers:**
 * - `CompleteSetupHandler`: TransactionalCommandHandler fuer Setup
 * - `LOGGER`: NestJS Logger Adapter
 */
@Module({
  imports: [PrismaModule, ServerAccessTokenInfrastructureModule, UserInfrastructureModule, OutboxModule],
  controllers: [AdminSetupController],
  providers: [
    // Logger fuer Handler
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('AdminModule'),
    },
    // Command Handler
    CompleteSetupHandler,
  ],
})
export class AdminModule {}
