import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { InfrastructureCommonModule } from '@/infrastructure/common.module';
import { LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { KraefteInfrastructureModule } from '@/infrastructure/kraefte/kraefte-infrastructure.module';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { EigenschutzRolleGuard } from './guards/eigenschutz-rolle.guard';
import { EinsatzScopeGuard } from './guards/einsatz-scope.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthApplicationModule } from '@/application/auth/auth-application.module';
import { ExchangeInviteHandler } from '@/application/auth/commands/exchange-invite.handler';
import { InviteCodeInfrastructureModule } from '@/infrastructure/invite-code/invite-code-infrastructure.module';
import { PasswordModule } from '@/infrastructure/password/password.module';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';

// Seiteneffekt-Import: Declaration-Merging für `Express.Request.einsatzContext`.
// Datei wird hier einmalig importiert, damit die globale Typ-Augmentation in
// allen Controller-Tests / TSC-Builds greift.
import './interfaces/einsatz-request-context';

/**
 * Authentifizierungsmodul für BlueLight Hub
 *
 * Dieses Modul verwaltet die Benutzer-Authentifizierung ohne Passwörter.
 * Der erste registrierte Benutzer erhält automatisch die SUPER_ADMIN-Rolle.
 * Alle weiteren Benutzer erhalten standardmäßig die USER-Rolle.
 *
 * Features:
 * - Benutzerregistrierung ohne Passwort
 * - Benutzeranmeldung nur mit Benutzernamen
 * - Automatische SUPER_ADMIN-Zuweisung für ersten Benutzer
 * - Rollenbasierte Zugriffskontrolle
 * - JWT-basierte Authentifizierung mit Access- und Refresh-Tokens
 */
@Module({
  imports: [
    PrismaModule,
    InfrastructureCommonModule,
    PassportModule,
    JwtModule.register({}),
    // CQRS Application Layer für Auth Commands (Login, Logout)
    AuthApplicationModule,
    // Infrastructure Module für ExchangeInviteHandler Dependencies
    InviteCodeInfrastructureModule,
    ServerAccessTokenInfrastructureModule,
    // Password Validation für Admin-Setup und Passwort-Prüfungen
    PasswordModule,
    // Kräfte-Repositories für EinsatzScopeGuard (Story 1.3 / ADR-012).
    // Stellt `KRAEFTE_REPOSITORIES.ROLLEN_BESETZUNG` für den Membership-Check bereit.
    KraefteInfrastructureModule,
  ],
  controllers: [AuthController],
  providers: [
    // Logger für AdminJwtStrategy (Security Logging)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Auth'),
    },
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    AdminJwtStrategy,
    AdminJwtAuthGuard,
    // Plattform-Pattern (ADR-012): Membership-Check für einsatz-scoped Routen.
    // Bewusst KEIN APP_GUARD — wird pro Controller via @UseGuards eingesetzt.
    EinsatzScopeGuard,
    // Story 1.5 (AC1, AC3): Eigenschutz-Rolle- und Permission-Guards.
    // Konsumieren `request.einsatzContext` aus `EinsatzScopeGuard` — Reihenfolge
    // in `@UseGuards(...)` wird im Consumer-Controller sichergestellt.
    EigenschutzRolleGuard,
    PermissionsGuard,
    ExchangeInviteHandler,
  ],
  exports: [AuthService, JwtModule, AdminJwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard, PermissionsGuard],
})
export class AuthModule {}
