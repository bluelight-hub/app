import { Module } from '@nestjs/common';

import {
  CompleteSetupHandler,
  CreateAccessTokenHandler,
  CreateInviteHandler,
  MigrateToSecureModeHandler,
  ReactivateAccessTokenHandler,
  RotateAccessTokenHandler,
  RevokeAccessTokenHandler,
  RevokeInviteHandler,
} from '@/application/admin/commands';
import { ServerAccessTokenUsedEventHandler } from '@/application/admin/event-handlers';
import { ListInvitesHandler, GetTokenListHandler, GetSecurityStatusHandler } from '@/application/admin/queries';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';
import { ServerConfigInfrastructureModule } from '@/infrastructure/server-config/server-config-infrastructure.module';
import { UserInfrastructureModule } from '@/infrastructure/user/user-infrastructure.module';
import { InviteCodeInfrastructureModule } from '@/infrastructure/invite-code';
import { PasswordModule } from '@/infrastructure/password/password.module';
import { LOGGER } from '@infrastructure/di-tokens';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';

import { AdminSetupController } from './controllers/admin-setup.controller';
import { AdminInviteController } from './controllers/admin-invite.controller';
import { AdminTokenController } from './controllers/admin-token.controller';
import { AdminSecurityController } from './controllers/admin-security.controller';
import { AdminRuntimeConfigController } from './controllers/admin-runtime-config.controller';

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
 * - `/admin/security`: Security-Mode Verwaltung (Story 4.6)
 *   - GET /status: Security-Status abfragen
 *   - POST /migrate-to-secure: Zu SECURE Mode migrieren
 *
 * **Imports:**
 * - `PrismaModule`: Datenbankzugriff
 * - `ServerAccessTokenInfrastructureModule`: Token-Repository (Story 1.1, 4.1)
 * - `ServerConfigInfrastructureModule`: ServerConfig-Repository (Story 4.6)
 * - `UserInfrastructureModule`: User-Repository
 * - `InviteCodeInfrastructureModule`: InviteCode-Repository (Story 1.6)
 * - `OutboxModule`: Transactional Outbox Pattern (exportiert OUTBOX_REPOSITORY)
 *
 * **Command Handlers:**
 * - `CompleteSetupHandler`: TransactionalCommandHandler fuer Setup
 * - `CreateInviteHandler`: TransactionalCommandHandler fuer Invite-Code Erstellung
 * - `RevokeInviteHandler`: TransactionalCommandHandler fuer Invite-Code Widerruf
 * - `CreateAccessTokenHandler`: TransactionalCommandHandler fuer Access-Token Erstellung
 * - `MigrateToSecureModeHandler`: TransactionalCommandHandler fuer SECURE Mode Migration
 *
 * **Query Handlers:**
 * - `ListInvitesHandler`: Handler fuer Invite-Code Auflistung
 * - `GetTokenListHandler`: Handler fuer Access-Token Auflistung
 * - `GetSecurityStatusHandler`: Handler fuer Security-Status Abfrage
 *
 * **Event Handlers:**
 * - `ServerAccessTokenUsedEventHandler`: Asynchrones Usage-Tracking mit Debounce (Story 4.3)
 *
 * **Providers:**
 * - `LOGGER`: NestJS Logger Adapter
 */
@Module({
  imports: [PrismaModule, ServerAccessTokenInfrastructureModule, ServerConfigInfrastructureModule, UserInfrastructureModule, InviteCodeInfrastructureModule, OutboxModule, PasswordModule],
  controllers: [AdminSetupController, AdminInviteController, AdminTokenController, AdminSecurityController, AdminRuntimeConfigController],
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
    RevokeAccessTokenHandler,
    ReactivateAccessTokenHandler,
    RotateAccessTokenHandler,
    MigrateToSecureModeHandler,
    // Query Handlers
    ListInvitesHandler,
    GetTokenListHandler,
    GetSecurityStatusHandler,
    // Event Handlers
    ServerAccessTokenUsedEventHandler,
  ],
})
export class AdminModule {}
