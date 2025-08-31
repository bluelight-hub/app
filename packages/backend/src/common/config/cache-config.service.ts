import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service zur Bereitstellung der Cache-Konfiguration
 *
 * Dieser Service kapselt die Cache-Konfiguration und stellt sie
 * für das CacheModule zur Verfügung. Er nutzt Environment-Variables
 * für flexible Konfiguration in verschiedenen Umgebungen.
 */
@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Erstellt die Cache-Konfiguration für das CacheModule
   * @returns Cache-Konfigurationsoptionen
   */
  createCacheOptions(): CacheModuleOptions {
    return {
      store: 'memory',
      ttl: this.getCacheTtl(),
      max: this.getCacheMaxItems(),
      isGlobal: true,
    };
  }

  /**
   * Gibt die TTL (Time To Live) in Sekunden zurück
   * @returns TTL in Sekunden (default: 3600 = 1 Stunde)
   */
  getCacheTtl(): number {
    const ttl = this.configService.get<number>('CACHE_TTL_SECONDS', 3600);
    return this.validatePositiveNumber(ttl, 'CACHE_TTL_SECONDS', 3600);
  }

  /**
   * Gibt die maximale Anzahl von Cache-Einträgen zurück
   * @returns Maximale Anzahl von Cache-Einträgen (default: 1000)
   */
  getCacheMaxItems(): number {
    const maxItems = this.configService.get<number>('CACHE_MAX_ITEMS', 1000);
    return this.validatePositiveNumber(maxItems, 'CACHE_MAX_ITEMS', 1000);
  }

  /**
   * Gibt die aktuelle Cache-Konfiguration zurück (für Tests und Debugging)
   * @returns Aktuelle Cache-Konfiguration
   */
  getCacheConfig() {
    return {
      store: 'memory',
      ttl: this.getCacheTtl(),
      max: this.getCacheMaxItems(),
    };
  }

  /**
   * Validiert, dass ein Wert eine positive Zahl ist
   * @param value - Der zu validierende Wert
   * @param name - Name der Environment-Variable für Fehlermeldungen
   * @param defaultValue - Fallback-Wert bei ungültiger Eingabe
   * @returns Validierter Wert oder Default-Wert
   */
  private validatePositiveNumber(value: number, name: string, defaultValue: number): number {
    // Prüfe ob der Wert existiert und eine positive ganze Zahl ist
    if (value === undefined || value === null || value <= 0 || !Number.isInteger(value)) {
      // Nur warnen wenn der Wert ungültig ist (nicht wenn er dem Default entspricht)
      if (value !== defaultValue && value !== undefined && value !== null) {
        console.warn(`Invalid ${name} value: ${value}. Using default: ${defaultValue}`);
      }
      return defaultValue;
    }
    return value;
  }
}
