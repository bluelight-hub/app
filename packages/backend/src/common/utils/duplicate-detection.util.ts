import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Konfiguration für Duplicate Detection
 */
export interface DuplicateDetectionConfig {
    /** Zeitfenster in Millisekunden für Duplicate Detection */
    timeWindow: number;
    /** Maximale Anzahl von Operationen im Cache */
    maxCacheSize: number;
    /** Cleanup-Intervall in Millisekunden */
    cleanupInterval: number;
}

/**
 * Standard-Konfiguration für Duplicate Detection
 */
export const DEFAULT_DUPLICATE_CONFIG: DuplicateDetectionConfig = {
    timeWindow: 60000, // 1 Minute
    maxCacheSize: 1000,
    cleanupInterval: 300000, // 5 Minuten
};

/**
 * Operation-Metadaten für Duplicate Detection
 */
interface OperationMetadata {
    hash: string;
    timestamp: number;
    result?: any;
    error?: any;
}

/**
 * Utility-Klasse für Duplicate Detection und idempotente Operationen
 */
export class DuplicateDetectionUtil {
    private readonly logger = new Logger(DuplicateDetectionUtil.name);
    private readonly operationCache = new Map<string, OperationMetadata>();
    private cleanupTimer?: NodeJS.Timeout;

    constructor(private readonly config: DuplicateDetectionConfig = DEFAULT_DUPLICATE_CONFIG) {
        this.startCleanupTimer();
    }

    /**
     * Führt eine Operation idempotent aus
     * 
     * @param operationId Eindeutige ID für die Operation
     * @param operation Die auszuführende Operation
     * @param data Daten für Hash-Generierung
     * @returns Das Ergebnis der Operation
     */
    async executeIdempotent<T>(
        operationId: string,
        operation: () => Promise<T>,
        data: any,
    ): Promise<T> {
        const hash = this.generateOperationHash(operationId, data);
        const existing = this.operationCache.get(hash);

        // Prüfen, ob Operation bereits ausgeführt wurde
        if (existing && this.isWithinTimeWindow(existing.timestamp)) {
            this.logger.debug(`Idempotente Operation gefunden: ${operationId}`);

            if (existing.error) {
                throw existing.error;
            }

            return existing.result;
        }

        try {
            this.logger.debug(`Führe neue Operation aus: ${operationId}`);
            const result = await operation();

            // Erfolgreiches Ergebnis cachen
            this.operationCache.set(hash, {
                hash,
                timestamp: Date.now(),
                result,
            });

            this.ensureCacheSize();
            return result;
        } catch (error) {
            // Fehler cachen für konsistente Wiederholung
            this.operationCache.set(hash, {
                hash,
                timestamp: Date.now(),
                error,
            });

            this.ensureCacheSize();
            throw error;
        }
    }

    /**
     * Generiert einen Hash für eine Operation
     * 
     * @param operationId ID der Operation
     * @param data Daten für Hash-Generierung
     * @returns SHA-256 Hash
     */
    private generateOperationHash(operationId: string, data: any): string {
        const hashInput = JSON.stringify({
            operationId,
            data: this.normalizeData(data),
        });

        return createHash('sha256').update(hashInput).digest('hex');
    }

    /**
     * Normalisiert Daten für konsistente Hash-Generierung
     * 
     * @param data Zu normalisierende Daten
     * @returns Normalisierte Daten
     */
    private normalizeData(data: any): any {
        if (data === null || data === undefined) {
            return null;
        }

        if (typeof data === 'object') {
            if (Array.isArray(data)) {
                return data.map(item => this.normalizeData(item)).sort();
            }

            const normalized: any = {};
            const sortedKeys = Object.keys(data).sort();

            for (const key of sortedKeys) {
                normalized[key] = this.normalizeData(data[key]);
            }

            return normalized;
        }

        return data;
    }

    /**
     * Prüft, ob ein Timestamp innerhalb des Zeitfensters liegt
     * 
     * @param timestamp Zu prüfender Timestamp
     * @returns true, wenn innerhalb des Zeitfensters
     */
    private isWithinTimeWindow(timestamp: number): boolean {
        return Date.now() - timestamp <= this.config.timeWindow;
    }

    /**
     * Stellt sicher, dass der Cache die maximale Größe nicht überschreitet
     */
    private ensureCacheSize(): void {
        if (this.operationCache.size <= this.config.maxCacheSize) {
            return;
        }

        // Älteste Einträge entfernen
        const entries = Array.from(this.operationCache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);

        const toRemove = entries.slice(0, entries.length - this.config.maxCacheSize);

        for (const [hash] of toRemove) {
            this.operationCache.delete(hash);
        }

        this.logger.debug(`Cache bereinigt: ${toRemove.length} Einträge entfernt`);
    }

    /**
     * Startet den automatischen Cleanup-Timer
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    /**
     * Bereinigt abgelaufene Einträge aus dem Cache
     */
    private cleanup(): void {
        const now = Date.now();
        let removedCount = 0;

        for (const [hash, metadata] of this.operationCache.entries()) {
            if (now - metadata.timestamp > this.config.timeWindow) {
                this.operationCache.delete(hash);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            this.logger.debug(`Cleanup abgeschlossen: ${removedCount} abgelaufene Einträge entfernt`);
        }
    }

    /**
     * Stoppt den Cleanup-Timer (für Tests oder Shutdown)
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }

        this.operationCache.clear();
    }

    /**
     * Gibt Cache-Statistiken zurück
     */
    getCacheStats(): { size: number; oldestEntry?: number; newestEntry?: number } {
        if (this.operationCache.size === 0) {
            return { size: 0 };
        }

        const timestamps = Array.from(this.operationCache.values()).map(m => m.timestamp);

        return {
            size: this.operationCache.size,
            oldestEntry: Math.min(...timestamps),
            newestEntry: Math.max(...timestamps),
        };
    }
} 