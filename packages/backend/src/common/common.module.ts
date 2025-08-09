import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { PrismaModule } from '@/prisma/prisma.module';
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
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonModule {}
