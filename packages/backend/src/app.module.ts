import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { UserManagementModule } from './user-management/user-management.module';

/**
 * Haupt-Anwendungsmodul der Bluelight Hub Backend-Anwendung
 *
 * Dieses Modul orchestriert alle Anwendungsmodule und konfiguriert
 * globale Einstellungen und Guards. Es stellt die zentrale
 * Einstiegsstelle für die NestJS-Anwendung dar.
 *
 * Features:
 * - Globale Umgebungskonfiguration
 * - Aufgabenplanung mit ScheduleModule
 * - Event-basierte Kommunikation
 * - JWT-basierte Authentifizierung als globaler Guard
 * - Datenbankanbindung über Prisma
 *
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    HealthModule,
    CommonModule,
    AuthModule,
    UserManagementModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
