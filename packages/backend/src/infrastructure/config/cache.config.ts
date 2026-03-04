import { registerAs } from '@nestjs/config';
import { milliseconds } from 'date-fns';

export interface CacheConfig {
  ttl: number;
  max: number;
  store: string;
  isGlobal: boolean;
}

export const cacheConfig = registerAs('cache', (): CacheConfig => {
  const ttlFromNewKey = process.env.CACHE_TTL;
  const ttlFromLegacyKey = process.env.CACHE_TTL_SECONDS;

  const ttlRaw = ttlFromNewKey ?? ttlFromLegacyKey ?? milliseconds({ minutes: 1 }).toString();
  const ttl = Number.parseInt(ttlRaw, 10);
  const max = Number.parseInt(process.env.CACHE_MAX_ITEMS ?? '100', 10);

  return {
    ttl: Number.isFinite(ttl) && ttl > 0 ? ttl : milliseconds({ minutes: 1 }),
    max: Number.isFinite(max) && max > 0 ? max : 100,
    store: process.env.CACHE_STORE ?? 'memory',
    isGlobal: process.env.CACHE_IS_GLOBAL !== 'false',
  };
});
