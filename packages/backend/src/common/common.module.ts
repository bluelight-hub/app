import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { AppConfigService } from './services/app-config.service';
import { RedisService } from './services/redis.service';

/**
 * Gemeinsames Modul für anwendungsübergreifende Funktionalitäten
 *
 * Dieses Modul bündelt wiederverwendbare Services und Utilities,
 * die von mehreren anderen Modulen genutzt werden. Dazu gehören:
 * - Paginierung für Datenbankabfragen
 * - Fehlerbehandlung mit Retry-Logik
 * - Audit-Logging-Funktionalität
 * - Redis-Service für Caching und verteilte Rate-Limits
 * - Rate-Limiting für API-Endpunkte
 *
 * @module CommonModule
 */
@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [RedisService, AppConfigService],
  exports: [RedisService, AppConfigService],
})
export class CommonModule {}
