import { Module } from '@nestjs/common';

import { CompleteSetupHandler, CreateInviteHandler, RevokeInviteHandler } from '@/application/admin/commands';
import { CreateAccessTokenHandler } from '@/application/admin/commands/create-access-token.handler';
import { ListInvitesHandler, GetTokenListHandler } from '@/application/admin/queries';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { InviteCodeInfrastructureModule } from '@/infrastructure/invite-code';
import { LOGGER } from '@infrastructure/di-tokens';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';

import { AdminSetupController } from './controllers/admin-setup.controller';
import { AdminInviteController } from './controllers/admin-invite.controller';
import { AdminTokenController } from './controllers/admin-token.controller';

/**
 * Admin-Modul fuer Server-Setup und Administration.
 *
 * Stellt folgende Endpoints bereit:
 * - `/admin/setup`: Initialer Server-Setup (Story 1.1)
 * - `/admin/invites`: Invite-Code Verwaltung (Story 1.6, 1.7)
 *   - POST: Invite-Code erstellen
 *   - GET: Invite-Codes auflisten (mit Filterung, Sortierung, Pagination)
 *   - DELETE /:id: Invite-Code widerrufen
 * - `/admin/tokens`: Access-Token Verwaltung (Story 4.1)
 *   - GET: Access-Tokens auflisten (mit Pagination)
 *   - POST: Access-Token erstellen
 *
 * **Imports:**
 * - `PrismaModule`: Datenbankzugriff
 * - `ServerAccessTokenInfrastructureModule`: Token-Repository (Story 1.1, 4.1)
 * - `UserInfrastructureModule`: User-Repository
 * - `InviteCodeInfrastructureModule`: InviteCode-Repository (Story 1.6)
 * - `OutboxModule`: Transactional Outbox Pattern (exportiert OUTBOX_REPOSITORY)
 *
 * **Command Handlers:**
 * - `CompleteSetupHandler`: TransactionalCommandHandler fuer Setup
 * - `CreateInviteHandler`: TransactionalCommandHandler fuer Invite-Code Erstellung
 * - `RevokeInviteHandler`: TransactionalCommandHandler fuer Invite-Code Widerruf
 * - `CreateAccessTokenHandler`: TransactionalCommandHandler fuer Access-Token Erstellung
 *
 * **Query Handlers:**
 * - `ListInvitesHandler`: Handler fuer Invite-Code Auflistung
 * - `GetTokenListHandler`: Handler fuer Access-Token Auflistung
 *
 * **Providers:**
 * - `LOGGER`: NestJS Logger Adapter
 */
@Module({
  imports: [PrismaModule, ServerAccessTokenInfrastructureModule, UserInfrastructureModule, InviteCodeInfrastructureModule, OutboxModule],
  controllers: [AdminSetupController, AdminInviteController, AdminTokenController],
  providers: [
    // Logger fuer Handler
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('AdminModule'),
    },
    // Command Handlers
    CompleteSetupHandler,
    CreateInviteHandler,
    RevokeInviteHandler,
    CreateAccessTokenHandler,
    // Query Handlers
    ListInvitesHandler,
    GetTokenListHandler,
  ],
})
export class AdminModule {}
