import { PrismaModule } from '@/prisma/prisma.module';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AppConfigService } from './services/app-config.service';
import { CacheConfigService } from './config/cache-config.service';
import { cacheConfig } from './config/cache.config';
import { CacheRateLimiterService } from './services/cache-rate-limiter.service';
import { CacheDuplicateDetectionService } from './services/cache-duplicate-detection.service';
import { TransformInterceptor } from './interceptors/transform.interceptor';

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
    ConfigModule.forFeature(cacheConfig),
    PrismaModule,
    CacheModule.registerAsync({
      imports: [ConfigModule.forFeature(cacheConfig)],
      useClass: CacheConfigService,
      // isGlobal wird über das @Global() Decorator am CommonModule gewährleistet
    }),
  ],
  providers: [
    AppConfigService,
    CacheConfigService,
    CacheRateLimiterService,
    CacheDuplicateDetectionService,
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => new TransformInterceptor(reflector),
      inject: [Reflector],
    },
  ],
  exports: [AppConfigService, CacheConfigService, CacheRateLimiterService, CacheDuplicateDetectionService, CacheModule],
})
export class CommonModule {}
