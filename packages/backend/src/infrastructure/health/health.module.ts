import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';
import { ResilienceModule } from '@/infrastructure/resilience/resilience.module';
import { MonitoringModule } from '@/modules/monitoring/monitoring.module';

/**
 * Health-Check-Modul für die Anwendungsüberwachung
 *
 * Dieses Modul stellt Endpunkte und Services für die Überwachung
 * der Anwendungsgesundheit bereit. Es integriert Terminus für
 * standardisierte Health-Checks und bietet benutzerdefinierte
 * Indikatoren für kritische Komponenten.
 *
 * Features:
 * - Datenbank-Konnektivitätsprüfung über PrismaHealthIndicator
 * - HTTP-basierte Health-Check-Endpunkte
 * - Integration mit Monitoring-Systemen
 *
 * **Story 1.4 Änderungen:**
 * - ServerAccessTokenInfrastructureModule Import für Token-Validierung
 *   (ermöglicht Zugang zu IServerAccessTokenRepository via DI)
 *
 * **Story 4.6 Änderungen:**
 * **Story 5.6 Änderungen:**
 * - MonitoringModule Import für GetSystemHealthQueryHandler (AC2)
 *
 * @module HealthModule
 * @class HealthModule
 */
@Module({
  imports: [TerminusModule, ServerAccessTokenInfrastructureModule, ResilienceModule, MonitoringModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
  exports: [PrismaHealthIndicator],
})
export class HealthModule {}
