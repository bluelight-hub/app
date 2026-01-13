import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { ServerAccessTokenInfrastructureModule } from '@/infrastructure/server-access-token/server-access-token-infrastructure.module';
import { ServerConfigInfrastructureModule } from '@/infrastructure/server-config/server-config-infrastructure.module';

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
 * - ServerConfigInfrastructureModule Import für insecureMode aus DB
 *   (ermöglicht Zugang zu IServerConfigRepository via DI)
 *
 * @module HealthModule
 * @class HealthModule
 */
@Module({
  imports: [TerminusModule, ServerAccessTokenInfrastructureModule, ServerConfigInfrastructureModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
  exports: [PrismaHealthIndicator],
})
export class HealthModule {}
