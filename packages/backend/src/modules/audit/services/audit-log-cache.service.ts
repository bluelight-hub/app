import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { logger } from '../../../logger/consola.logger';

/**
 * Cache-Service für Audit-Log-Statistiken
 *
 * Verwendet Redis für schnellen Zugriff auf häufig abgerufene Audit-Daten.
 * Dieser Service verbessert die Performance bei wiederholten Abfragen von
 * Statistiken und reduzierten Datenbanklasten durch intelligentes Caching.
 *
 * **Hauptfunktionen:**
 * - Redis-basiertes Caching mit konfigurierbarer TTL
 * - Structured Cache Keys für Statistiken und Queries
 * - Pattern-basierte Invalidierung
 * - Graceful Degradation bei Redis-Ausfällen
 *
 * **Konfiguration:**
 * - AUDIT_CACHE_ENABLED: Aktiviert/deaktiviert Caching
 * - AUDIT_CACHE_TTL: Standard Time-to-Live in Sekunden
 * - REDIS_*: Redis-Verbindungsparameter
 *
 * @class AuditLogCacheService
 * @implements {OnModuleInit}
 * @example
 * ```typescript
 * // Statistiken cachen
 * const statsKey = cacheService.generateStatisticsKey({ userId: '123', date: '2024-01' });
 * await cacheService.set(statsKey, statistics, 300);
 *
 * // Aus Cache abrufen
 * const cached = await cacheService.get<AuditStatistics>(statsKey);
 * if (cached) return cached;
 * ```
 */
@Injectable()
export class AuditLogCacheService implements OnModuleInit {
  /**
   * Redis-Client-Instanz
   * @private
   * @property {Redis} redis - ioredis Client für Cache-Operationen
   */
  private redis: Redis;

  /**
   * Präfix für alle Cache-Schlüssel
   * @private
   * @readonly
   * @property {string} cachePrefix - Namespace-Präfix für Audit-Cache-Keys
   */
  private readonly cachePrefix = 'audit:';

  /**
   * Standard Time-to-Live in Sekunden
   * @private
   * @readonly
   * @property {number} defaultTTL - Standard-Ablaufzeit für Cache-Einträge
   */
  private readonly defaultTTL: number;

  /**
   * Cache-Aktivierungsstatus
   * @private
   * @readonly
   * @property {boolean} isEnabled - Ob Caching aktiviert ist
   */
  private readonly isEnabled: boolean;

  /**
   * Konstruktor des AuditLogCacheService
   *
   * @param {ConfigService} configService - Service für Konfigurationszugriff
   */
  constructor(private readonly configService: ConfigService) {
    this.defaultTTL = this.configService.get<number>('AUDIT_CACHE_TTL', 300); // 5 minutes
    this.isEnabled = this.configService.get<boolean>('AUDIT_CACHE_ENABLED', true);
  }

  onModuleInit() {
    if (!this.isEnabled) {
      logger.info('Audit log cache is disabled');
      return;
    }

    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_CACHE_DB', 1), // Different DB for cache
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      logger.info('Audit log cache connected to Redis');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis cache connection error', { error: error.message });
    });
  }

  /**
   * Generiert einen Cache-Schlüssel mit Präfix
   *
   * Erstellt einen namespaced Cache-Key durch Voranstellen des audit-Präfixes.
   * Dies verhindert Kollisionen mit anderen Cache-Systemen.
   *
   * @param {string} key - Der Basis-Schlüssel ohne Präfix
   * @returns {string} Der vollständige Cache-Schlüssel mit Präfix
   * @private
   * @example
   * ```typescript
   * const key = this.generateKey('stats:user123');
   * // Ergebnis: 'audit:stats:user123'
   * ```
   */
  private generateKey(key: string): string {
    return `${this.cachePrefix}${key}`;
  }

  /**
   * Speichert Daten im Cache
   * @param key Cache-Schlüssel
   * @param data Zu speichernde Daten
   * @param ttl Time-to-live in Sekunden
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.isEnabled || !this.redis) return;

    try {
      const cacheKey = this.generateKey(key);
      const serialized = JSON.stringify(data);

      if (ttl || this.defaultTTL) {
        await this.redis.setex(cacheKey, ttl || this.defaultTTL, serialized);
      } else {
        await this.redis.set(cacheKey, serialized);
      }

      logger.trace('Cache set', { key: cacheKey, ttl: ttl || this.defaultTTL });
    } catch (error) {
      logger.error('Failed to set cache', { key, error: error.message });
    }
  }

  /**
   * Ruft Daten aus dem Cache ab
   * @param key Cache-Schlüssel
   * @returns Gecachte Daten oder null
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) return null;

    try {
      const cacheKey = this.generateKey(key);
      const data = await this.redis.get(cacheKey);

      if (!data) {
        logger.trace('Cache miss', { key: cacheKey });
        return null;
      }

      logger.trace('Cache hit', { key: cacheKey });
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error('Failed to get cache', { key, error: error.message });
      return null;
    }
  }

  /**
   * Löscht einen Cache-Eintrag
   * @param key Cache-Schlüssel
   */
  async delete(key: string): Promise<void> {
    if (!this.isEnabled || !this.redis) return;

    try {
      const cacheKey = this.generateKey(key);
      await this.redis.del(cacheKey);
      logger.trace('Cache deleted', { key: cacheKey });
    } catch (error) {
      logger.error('Failed to delete cache', { key, error: error.message });
    }
  }

  /**
   * Löscht alle Cache-Einträge mit einem bestimmten Pattern
   * @param pattern Pattern für Cache-Schlüssel
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!this.isEnabled || !this.redis) return;

    try {
      const fullPattern = this.generateKey(pattern);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.trace('Cache pattern deleted', { pattern: fullPattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Failed to delete cache pattern', { pattern, error: error.message });
    }
  }

  /**
   * Invalidiert alle Audit-Log-Caches
   */
  async invalidateAll(): Promise<void> {
    await this.deletePattern('*');
  }

  /**
   * Invalidiert Statistik-Caches
   */
  async invalidateStatistics(): Promise<void> {
    await this.deletePattern('stats:*');
  }

  /**
   * Invalidiert Query-Caches
   */
  async invalidateQueries(): Promise<void> {
    await this.deletePattern('query:*');
  }

  /**
   * Erstellt einen Cache-Schlüssel für Statistiken
   */
  generateStatisticsKey(filters: Record<string, any>): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce(
        (acc, key) => {
          if (filters[key] !== undefined && filters[key] !== null) {
            acc[key] = filters[key];
          }
          return acc;
        },
        {} as Record<string, any>,
      );

    return `stats:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Erstellt einen Cache-Schlüssel für Queries
   */
  generateQueryKey(filters: Record<string, any>): string {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce(
        (acc, key) => {
          if (filters[key] !== undefined && filters[key] !== null) {
            acc[key] = filters[key];
          }
          return acc;
        },
        {} as Record<string, any>,
      );

    return `query:${JSON.stringify(sortedFilters)}`;
  }

  /**
   * Schließt die Redis-Verbindung
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      logger.info('Audit log cache disconnected from Redis');
    }
  }
}
