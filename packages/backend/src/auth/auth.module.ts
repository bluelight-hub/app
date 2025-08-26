import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

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
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy, AdminJwtStrategy, AdminJwtAuthGuard],
  exports: [AuthService, JwtModule, AdminJwtAuthGuard],
})
export class AuthModule {}
