import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthApplicationModule } from '@/application/auth/auth-application.module';
import { ExchangeInviteHandler } from '@/application/auth/commands/exchange-invite.handler';
import { InviteCodeInfrastructureModule } from '@/infrastructure/invite-code/invite-code-infrastructure.module';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';

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
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    // CQRS Application Layer für Auth Commands (Login, Logout)
    AuthApplicationModule,
    // Infrastructure Module für ExchangeInviteHandler Dependencies
    InviteCodeInfrastructureModule,
    ServerAccessTokenInfrastructureModule,
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
    ExchangeInviteHandler,
  ],
  exports: [AuthService, JwtModule, AdminJwtAuthGuard],
})
export class AuthModule {}
