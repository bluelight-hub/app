import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { EinsatzModule } from './einsatz/einsatz.module';
import { EtbModule } from './etb/etb.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserManagementModule } from './user-management/user-management.module';
import { LagekarteModule } from './modules/lagekarte/lagekarte.module';

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
    EventEmitterModule.forRoot({
      // Event-basierte Kommunikation zwischen Modulen
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per minute globally
      },
    ]),
    PrismaModule,
    HealthModule,
    CommonModule,
    AuthModule,
    UserManagementModule,
    EinsatzModule,
    EtbModule,
    LagekarteModule,
  ],
  controllers: [AppController],
  providers: [
    Logger,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
