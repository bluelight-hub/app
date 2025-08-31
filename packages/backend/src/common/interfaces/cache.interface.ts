/**
 * Cache-Konfigurationsinterface
 *
 * Definiert die Struktur der Cache-Konfiguration
 */
export interface CacheConfig {
  /** Cache-Store-Typ (z.B. 'memory', 'redis') */
  store: string;

  /** Time-To-Live in Sekunden */
  ttl: number;

  /** Maximale Anzahl von Cache-Einträgen */
  max: number;
}

/**
 * Enum für konsistente Cache-Keys
 *
 * Zentrale Definition aller Cache-Keys zur Vermeidung von
 * Tippfehlern und zur besseren Wartbarkeit
 */
export enum CacheKey {
  // Einsatz-bezogene Cache-Keys
  EINSATZ_LIST = 'einsatz:list',
  EINSATZ_DETAIL = 'einsatz:detail',
  EINSATZ_COUNT = 'einsatz:count',

  // User-bezogene Cache-Keys
  USER_DATA = 'user:data',
  USER_PERMISSIONS = 'user:permissions',
  USER_SESSION = 'user:session',

  // Statistik-bezogene Cache-Keys
  STATS_DASHBOARD = 'stats:dashboard',
  STATS_REPORTS = 'stats:reports',

  // System-bezogene Cache-Keys
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_HEALTH = 'system:health',
}

/**
 * Cache-Eintrag Interface
 *
 * Definiert die Struktur eines einzelnen Cache-Eintrags
 */
export interface CacheEntry<T = any> {
  /** Der gecachte Wert */
  value: T;

  /** Zeitstempel der Erstellung */
  createdAt: Date;

  /** Zeitstempel des Ablaufs (optional) */
  expiresAt?: Date;

  /** Anzahl der Zugriffe auf diesen Eintrag */
  hitCount?: number;
}

/**
 * Cache-Statistik Interface
 *
 * Definiert Metriken zur Cache-Performance
 */
export interface CacheStats {
  /** Anzahl der Cache-Treffer */
  hits: number;

  /** Anzahl der Cache-Fehltreffer */
  misses: number;

  /** Aktuelle Anzahl der Cache-Einträge */
  size: number;

  /** Maximale Anzahl der Cache-Einträge */
  maxSize: number;

  /** Cache-Trefferquote in Prozent */
  hitRate: number;
}
