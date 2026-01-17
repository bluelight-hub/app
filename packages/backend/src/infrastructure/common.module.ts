import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { AppConfigService } from './services/app-config.service';
import { CacheConfigService, NestLoggerAdapter } from './common/adapters';
import { cacheConfig } from './config/cache.config';
import { CacheRateLimiterService } from './services/cache-rate-limiter.service';
import { CacheDuplicateDetectionService } from './services/cache-duplicate-detection.service';
import { TransformInterceptor } from './http/interceptors/transform.interceptor';
import { LOGGER } from './di-tokens';

/**
 * Infrastructure Common Module
 *
 * Dieses Modul bündelt infrastruktur-übergreifende Funktionalitäten aus der
 * Infrastructure Layer gemäß Clean Architecture:
 * - HTTP-bezogene Concerns (Filters, Guards, Interceptors, Pipes)
 * - Konfigurationsservices
 * - Cache-Management
 * - Application-weite Services
 *
 * @module InfrastructureCommonModule
 */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(cacheConfig),
    PrismaModule,
    CacheModule.registerAsync({
      imports: [ConfigModule.forFeature(cacheConfig)],
      useClass: CacheConfigService,
      // extraProviders für DI-Abhängigkeiten von CacheConfigService
      extraProviders: [
        {
          provide: LOGGER,
          useFactory: () => new NestLoggerAdapter('Cache'),
        },
      ],
      // isGlobal wird über das @Global() Decorator am InfrastructureCommonModule gewährleistet
    }),
  ],
  providers: [
    // Logger für Infrastructure Services (Cache, Rate Limiting, etc.)
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('InfrastructureCommon'),
    },
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
  exports: [AppConfigService, CacheConfigService, CacheRateLimiterService, CacheDuplicateDetectionService, CacheModule, LOGGER],
})
export class InfrastructureCommonModule {}
