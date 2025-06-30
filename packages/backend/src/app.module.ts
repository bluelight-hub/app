import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { ConsolaLogger } from './logger/consola.logger';
import { EinsatzModule } from './modules/einsatz/einsatz.module';
import { EtbModule } from './modules/etb/etb.module';
import { SeedModule } from './modules/seed/seed.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards';
import { AuditModule, AuditLogInterceptor } from './modules/audit';

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
    PrismaModule,
    AuthModule,
    AuditModule,
    HealthModule,
    EinsatzModule,
    EtbModule,
    CommonModule,
    SeedModule.registerAsync(),
  ],
  controllers: [],
  providers: [
    {
      provide: 'Logger',
      useClass: ConsolaLogger,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
