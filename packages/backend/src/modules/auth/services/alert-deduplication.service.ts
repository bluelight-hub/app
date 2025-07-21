import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import * as crypto from 'crypto';

/**
 * Service zur Deduplizierung von Security Alerts
 *
 * Verwendet Redis für hochperformante Fingerprint-basierte Deduplizierung
 * mit konfigurierbaren Zeitfenstern. Verhindert Alert-Fatigue durch
 * intelligente Gruppierung ähnlicher Alerts.
 *
 * Features:
 * - SHA256-basierte Fingerprints
 * - Sliding Time Windows
 * - Atomic Operations via Redis
 * - Configurable TTL
 * - Metrics Tracking
 */
@Injectable()
export class AlertDeduplicationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertDeduplicationService.name);
  private readonly keyPrefix = 'alert:dedup:';
  private readonly metricsKey = 'alert:dedup:metrics';
  private deduplicationWindow: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.deduplicationWindow = this.configService.get<number>(
      'ALERT_DEDUPLICATION_WINDOW',
      300000, // 5 minutes default
    );
  }

  async onModuleInit() {
    this.logger.log('Alert Deduplication Service initialized');

    // Start periodic cleanup
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredEntries(),
      60000, // Run every minute
    );
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Generiert einen Fingerprint für Alert-Deduplizierung
   *
   * @param components - Komponenten für den Fingerprint
   * @param timeWindow - Zeitfenster in Millisekunden (optional)
   * @returns SHA256 Fingerprint (16 Zeichen)
   */
  generateFingerprint(
    components: {
      type: string;
      userId?: string;
      ipAddress?: string;
      ruleId?: string;
      sessionId?: string;
      [key: string]: any;
    },
    timeWindow?: number,
  ): string {
    const window = timeWindow || this.deduplicationWindow;
    const timeSlot = Math.floor(Date.now() / window);

    // Build fingerprint components
    const fingerprintData = [
      components.type,
      components.userId || 'anonymous',
      components.ipAddress || 'unknown',
      components.ruleId || 'manual',
      components.sessionId || 'no-session',
      timeSlot,
    ];

    // Add any additional components
    Object.keys(components)
      .filter((key) => !['type', 'userId', 'ipAddress', 'ruleId', 'sessionId'].includes(key))
      .sort()
      .forEach((key) => {
        fingerprintData.push(`${key}:${components[key]}`);
      });

    const hash = crypto.createHash('sha256').update(fingerprintData.join('|')).digest('hex');

    return hash.substring(0, 16);
  }

  /**
   * Prüft ob ein Alert bereits existiert (dedupliziert werden sollte)
   *
   * @param fingerprint - Der Alert-Fingerprint
   * @returns true wenn Alert bereits existiert
   */
  async checkDuplicate(fingerprint: string): Promise<boolean> {
    const key = `${this.keyPrefix}${fingerprint}`;
    const exists = await this.redis.exists(key);

    if (exists) {
      // Increment occurrence count
      await this.redis.hincrby(key, 'count', 1);
      await this.redis.hset(key, 'lastSeen', Date.now());

      // Update metrics
      await this.incrementMetric('duplicates');

      return true;
    }

    return false;
  }

  /**
   * Registriert einen neuen Alert-Fingerprint
   *
   * @param fingerprint - Der Alert-Fingerprint
   * @param metadata - Zusätzliche Metadaten zum Alert
   * @param ttl - Time to live in Sekunden (optional)
   */
  async registerAlert(
    fingerprint: string,
    metadata: {
      alertId: string;
      type: string;
      severity: string;
      userId?: string;
      ipAddress?: string;
      [key: string]: any;
    },
    ttl?: number,
  ): Promise<void> {
    const key = `${this.keyPrefix}${fingerprint}`;
    const expirySeconds = ttl || Math.ceil(this.deduplicationWindow / 1000);

    // Store alert data
    await this.redis
      .multi()
      .hset(key, {
        alertId: metadata.alertId,
        type: metadata.type,
        severity: metadata.severity,
        userId: metadata.userId || '',
        ipAddress: metadata.ipAddress || '',
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        count: 1,
        metadata: JSON.stringify(metadata),
      })
      .expire(key, expirySeconds)
      .exec();

    // Update metrics
    await this.incrementMetric('registered');
  }

  /**
   * Holt Informationen über einen deduplizierten Alert
   *
   * @param fingerprint - Der Alert-Fingerprint
   * @returns Alert-Informationen oder null
   */
  async getAlertInfo(fingerprint: string): Promise<{
    alertId: string;
    type: string;
    severity: string;
    userId?: string;
    ipAddress?: string;
    firstSeen: Date;
    lastSeen: Date;
    count: number;
    metadata: any;
  } | null> {
    const key = `${this.keyPrefix}${fingerprint}`;
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return {
      alertId: data.alertId,
      type: data.type,
      severity: data.severity,
      userId: data.userId || undefined,
      ipAddress: data.ipAddress || undefined,
      firstSeen: new Date(parseInt(data.firstSeen)),
      lastSeen: new Date(parseInt(data.lastSeen)),
      count: parseInt(data.count),
      metadata: JSON.parse(data.metadata || '{}'),
    };
  }

  /**
   * Aktualisiert die Occurrence-Informationen eines Alerts
   *
   * @param fingerprint - Der Alert-Fingerprint
   * @param additionalData - Zusätzliche Daten zur Aktualisierung
   */
  async updateOccurrence(fingerprint: string, additionalData?: Record<string, any>): Promise<void> {
    const key = `${this.keyPrefix}${fingerprint}`;

    const updates: Record<string, any> = {
      lastSeen: Date.now(),
    };

    if (additionalData) {
      const existingData = await this.redis.hget(key, 'metadata');
      const metadata = JSON.parse(existingData || '{}');
      updates.metadata = JSON.stringify({ ...metadata, ...additionalData });
    }

    await this.redis.multi().hincrby(key, 'count', 1).hset(key, updates).exec();
  }

  /**
   * Löscht einen Alert-Fingerprint manuell
   *
   * @param fingerprint - Der zu löschende Fingerprint
   */
  async removeAlert(fingerprint: string): Promise<void> {
    const key = `${this.keyPrefix}${fingerprint}`;
    await this.redis.del(key);
  }

  /**
   * Holt alle aktiven deduplizierten Alerts
   *
   * @param pattern - Optional: Pattern für Filterung
   * @returns Liste der aktiven Alerts
   */
  async getActiveAlerts(pattern?: string): Promise<
    Array<{
      fingerprint: string;
      info: any;
    }>
  > {
    const searchPattern = pattern ? `${this.keyPrefix}*${pattern}*` : `${this.keyPrefix}*`;

    const keys = await this.redis.keys(searchPattern);
    const alerts = [];

    for (const key of keys) {
      const fingerprint = key.replace(this.keyPrefix, '');
      const info = await this.getAlertInfo(fingerprint);

      if (info) {
        alerts.push({ fingerprint, info });
      }
    }

    return alerts;
  }

  /**
   * Berechnet einen zeitbasierten Fingerprint
   *
   * Nützlich für Alerts die in bestimmten Zeitfenstern gruppiert werden sollen
   *
   * @param baseComponents - Basis-Komponenten (muss 'type' enthalten)
   * @param windowMinutes - Zeitfenster in Minuten
   * @returns Zeitbasierter Fingerprint
   */
  generateTimeBasedFingerprint(
    baseComponents: {
      type: string;
      userId?: string;
      ipAddress?: string;
      ruleId?: string;
      sessionId?: string;
      [key: string]: any;
    },
    windowMinutes: number = 5,
  ): string {
    const timeSlot = Math.floor(Date.now() / (windowMinutes * 60 * 1000));

    return this.generateFingerprint({
      ...baseComponents,
      timeSlot: timeSlot.toString(),
    });
  }

  /**
   * Batch-Prüfung mehrerer Fingerprints
   *
   * @param fingerprints - Array von Fingerprints
   * @returns Map mit Duplikat-Status
   */
  async checkDuplicatesBatch(fingerprints: string[]): Promise<Map<string, boolean>> {
    const pipeline = this.redis.pipeline();

    fingerprints.forEach((fp) => {
      pipeline.exists(`${this.keyPrefix}${fp}`);
    });

    const results = await pipeline.exec();
    const duplicateMap = new Map<string, boolean>();

    fingerprints.forEach((fp, index) => {
      duplicateMap.set(fp, results?.[index]?.[1] === 1);
    });

    return duplicateMap;
  }

  /**
   * Bereinigt abgelaufene Einträge
   *
   * Wird periodisch aufgerufen um Redis sauber zu halten
   */
  private async cleanupExpiredEntries(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) return;

      let cleaned = 0;
      const now = Date.now();

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);

        // Remove entries with no TTL or negative TTL
        if (ttl < 0) {
          await this.redis.del(key);
          cleaned++;
          continue;
        }

        // Check if entry is older than deduplication window
        const lastSeen = await this.redis.hget(key, 'lastSeen');
        if (lastSeen && now - parseInt(lastSeen) > this.deduplicationWindow) {
          await this.redis.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug(`Cleaned up ${cleaned} expired deduplication entries`);
      }
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Inkrementiert eine Metrik
   *
   * @param metric - Name der Metrik
   */
  private async incrementMetric(metric: string): Promise<void> {
    await this.redis.hincrby(this.metricsKey, metric, 1);
  }

  /**
   * Holt die aktuellen Deduplication-Metriken
   *
   * @returns Metriken-Objekt
   */
  async getMetrics(): Promise<{
    registered: number;
    duplicates: number;
    deduplicationRate: number;
    activeAlerts: number;
  }> {
    const [metrics, activeCount] = await Promise.all([
      this.redis.hgetall(this.metricsKey),
      this.redis.keys(`${this.keyPrefix}*`).then((keys) => keys.length),
    ]);

    const registered = parseInt(metrics.registered || '0');
    const duplicates = parseInt(metrics.duplicates || '0');
    const total = registered + duplicates;

    return {
      registered,
      duplicates,
      deduplicationRate: total > 0 ? duplicates / total : 0,
      activeAlerts: activeCount,
    };
  }

  /**
   * Reset Metriken (für Tests oder monatliche Resets)
   */
  async resetMetrics(): Promise<void> {
    await this.redis.del(this.metricsKey);
    this.logger.log('Deduplication metrics reset');
  }

  /**
   * Konfiguriert das Deduplication-Zeitfenster
   *
   * @param windowMs - Neues Zeitfenster in Millisekunden
   */
  setDeduplicationWindow(windowMs: number): void {
    this.deduplicationWindow = windowMs;
    this.logger.log(`Deduplication window set to ${windowMs}ms`);
  }

  /**
   * Erstellt einen Composite-Fingerprint aus mehreren Sub-Fingerprints
   *
   * Nützlich für komplexe Deduplizierungs-Szenarien
   *
   * @param subFingerprints - Array von Sub-Fingerprints
   * @returns Composite Fingerprint
   */
  createCompositeFingerprint(subFingerprints: string[]): string {
    return crypto
      .createHash('sha256')
      .update(subFingerprints.sort().join(':'))
      .digest('hex')
      .substring(0, 16);
  }
}
