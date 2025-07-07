import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
// import { ConsolaLogger } from './logger/consola.logger';
import { EinsatzModule } from './modules/einsatz/einsatz.module';
import { EtbModule } from './modules/etb/etb.module';
import { SeedModule } from './modules/seed/seed.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards';
import { AuditModule } from './modules/audit';
import { SessionModule } from './modules/session/session.module';

/**
 * Haupt-Anwendungsmodul, das die Abhängigkeiten und Provider der Anwendung konfiguriert.
 * Richtet Umgebungskonfiguration, Datenbankverbindung und Gesundheitschecks ein.
 *
 * @class AppModule
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    AuditModule,
    SessionModule,
    HealthModule,
    EinsatzModule,
    EtbModule,
    CommonModule,
    SeedModule.registerAsync(),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
