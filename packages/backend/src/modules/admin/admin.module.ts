import { Module } from '@nestjs/common';

import { CompleteSetupHandler, CreateInviteHandler } from '@/application/admin/commands';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { InviteCodeInfrastructureModule } from '@/infrastructure/invite-code';
import { LOGGER } from '@infrastructure/di-tokens';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';

import { AdminSetupController } from './controllers/admin-setup.controller';
import { AdminInviteController } from './controllers/admin-invite.controller';

/**
 * Admin-Modul fuer Server-Setup und Administration.
 *
 * Stellt folgende Endpoints bereit:
 * - `/admin/setup`: Initialer Server-Setup (Story 1.1)
 * - `/admin/invites`: Invite-Code Verwaltung (Story 1.6)
 *
 * **Imports:**
 * - `PrismaModule`: Datenbankzugriff
 * - `ServerAccessTokenInfrastructureModule`: Token-Repository (Story 1.1)
 * - `UserInfrastructureModule`: User-Repository
 * - `InviteCodeInfrastructureModule`: InviteCode-Repository (Story 1.6)
 * - `OutboxModule`: Transactional Outbox Pattern (exportiert OUTBOX_REPOSITORY)
 *
 * **Providers:**
 * - `CompleteSetupHandler`: TransactionalCommandHandler fuer Setup
 * - `CreateInviteHandler`: TransactionalCommandHandler fuer Invite-Codes
 * - `LOGGER`: NestJS Logger Adapter
 */
@Module({
  imports: [PrismaModule, ServerAccessTokenInfrastructureModule, UserInfrastructureModule, InviteCodeInfrastructureModule, OutboxModule],
  controllers: [AdminSetupController, AdminInviteController],
  providers: [
    // Logger fuer Handler
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('AdminModule'),
    },
    // Command Handler
    CompleteSetupHandler,
    CreateInviteHandler,
  ],
})
export class AdminModule {}
