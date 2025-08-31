import { PrismaModule } from '@/prisma/prisma.module';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppConfigService } from './services/app-config.service';
import { CacheConfigService } from './config/cache-config.service';

/**
 * Gemeinsames Modul für anwendungsübergreifende Funktionalitäten
 *
 * Dieses Modul bündelt wiederverwendbare Services und Utilities,
 * die von mehreren anderen Modulen genutzt werden. Dazu gehören:
 * - Paginierung für Datenbankabfragen
 * - Fehlerbehandlung mit Retry-Logik
 * - Audit-Logging-Funktionalität
 * - Rate-Limiting für API-Endpunkte
 * - Cache-Management mit konfigurierbarem TTL und Memory Store
 *
 * @module CommonModule
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useClass: CacheConfigService,
      isGlobal: true,
    }),
  ],
  providers: [AppConfigService, CacheConfigService],
  exports: [AppConfigService, CacheConfigService, CacheModule],
})
export class CommonModule {}
