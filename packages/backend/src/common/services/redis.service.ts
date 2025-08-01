import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Redis Service
 *
 * Stellt eine Verbindung zum Redis-Server her und bietet grundlegende
 * Redis-Operationen für die Anwendung.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const connectionLogger = new Logger('RedisConnection', { timestamp: true });
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            connectionLogger.error('🪫 Redis: Maximum reconnection attempts reached');
            return new Error('Redis: Maximum reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (_error) => {
      connectionLogger.error('⚠️ Redis Client Error');
    });

    this.client.on('connect', () => {
      connectionLogger.log('🔌 Redis: Connected successfully');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      this.logger.log('✅ Redis: Ready to accept commands');
    });

    this.client.on('reconnecting', () => {
      connectionLogger.warn('🔄 Redis: Reconnecting...');
      this.isConnected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (_error) {
      this.logger.error('📕 Failed to connect to Redis. Please check your configuration.');
      // Don't throw - allow app to run without Redis
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.client.quit();
    }
  }

  /**
   * Prüft, ob Redis verfügbar ist
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Get the Redis client instance
   */
  getClient(): RedisClientType | null {
    return this.isAvailable() ? this.client : null;
  }

  /**
   * Set a key-value pair with optional expiration
   */
  async set(key: string, value: string, expirationMs?: number): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    if (expirationMs) {
      await this.client.set(key, value, { PX: expirationMs });
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    const result = await this.client.get(key);
    return result as string | null;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    return await this.client.del(key);
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    return await this.client.incr(key);
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    return await this.client.ttl(key);
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) {
      throw new Error('Redis is not available');
    }

    const keys = await this.client.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    return await this.client.del(keys);
  }
}
