/**
 * Adresssuche Adapter - Implementierung des IAddressSuchePort via Photon (Komoot).
 *
 * HTTP-Client für die Photon Geocoding API (OpenStreetMap-basiert).
 *
 * **API-Spezifikationen:**
 * - Base URL: https://photon.komoot.io/api/
 * - Format: GeoJSON
 * - Auth: Keine (öffentliche API)
 * - Timeout: 5 Sekunden
 * - Fair Use: max. 1 Request pro Sekunde
 *
 * **Caching:**
 * - In-Memory via globalem CACHE_MANAGER (1h TTL)
 * - Cache Key: `addr:{countryCode}:{query}:{lat}:{lon}`
 *
 * **Fehlerbehandlung:**
 * - Timeout/Netzwerk: → GEO_003
 * - Rate Limit (intern): 1 req/sec Guard
 *
 * @module infrastructure/geo
 * @see IAddressSuchePort - Domain Port Interface
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Result } from '@domain/common/result';
import type { IAddressSuchePort, AddressSucheErgebnis, AddressSucheOptionen } from '@domain/ports/i-address-suche.port';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/** Base URL der Photon API */
const BASE_URL = 'https://photon.komoot.io/api/';

/** Timeout für HTTP-Requests in Millisekunden */
const REQUEST_TIMEOUT = 5000;

/** Cache TTL: 1 Stunde in Millisekunden */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Circuit Breaker Service-Name */
const CB_SERVICE_NAME = 'photon';

/** Minimaler Abstand zwischen Requests in Millisekunden (Fair Use Policy) */
const MIN_REQUEST_INTERVAL_MS = 1000;

/** User-Agent Header für Photon API */
const USER_AGENT = 'BluelightHub/1.0 (Katastrophenschutz-App)';

/**
 * Photon GeoJSON Feature Shape.
 */
interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
}

/**
 * Photon API Response Shape.
 */
interface PhotonResponse {
  features: PhotonFeature[];
}

@Injectable()
export class AddressSucheAdapter implements IAddressSuchePort {
  private readonly logger = new Logger(AddressSucheAdapter.name);

  /** Zeitpunkt des letzten API-Requests (Rate Limiting) */
  private lastRequestTime = 0;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists(CB_SERVICE_NAME);
  }

  async search(query: string, options?: AddressSucheOptionen): Promise<Result<AddressSucheErgebnis[]>> {
    const lang = options?.lang ?? 'de';
    const limit = Math.min(options?.limit ?? 5, 10);
    const countryCode = options?.countryCode?.toLowerCase();

    // Cache prüfen
    const cacheKey = `addr:${countryCode ?? ''}:${query}:${options?.lat ?? ''}:${options?.lon ?? ''}`;
    const cached = await this.cache.get<AddressSucheErgebnis[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return Result.ok(cached);
    }

    // HTTP-Call via Circuit Breaker
    const apiResult = await this.circuitBreaker.execute<Result<AddressSucheErgebnis[]>>(CB_SERVICE_NAME, async () => {
      return this.fetchFromApi(query, { ...options, lang, limit, countryCode });
    });

    // CB selbst fehlgeschlagen (Circuit Open o.ä.)
    if (apiResult.isFailure) {
      return Result.fail(GeoError.format(GEO_ERROR_CODES.SERVICE_UNAVAILABLE, apiResult.error ?? 'Circuit Breaker offen'));
    }

    // fetchFromApi-Result auspacken
    const fetchResult = apiResult.value!;
    if (fetchResult.isFailure) {
      return fetchResult;
    }

    // Ergebnisse cachen (auch leere, da valide Antwort)
    await this.cache.set(cacheKey, fetchResult.value!, CACHE_TTL_MS);
    this.logger.debug(`Cache SET: ${cacheKey}`);

    return fetchResult;
  }

  /**
   * HTTP-Request an Photon API mit Rate Limiting.
   *
   * Erzwingt mindestens 1 Sekunde Abstand zwischen Requests
   * (Photon Fair Use Policy).
   */
  private async fetchFromApi(query: string, options: { lang: string; limit: number; lat?: string; lon?: string; countryCode?: string }): Promise<Result<AddressSucheErgebnis[]>> {
    // Rate Limiting: mindestens 1 Sekunde zwischen Requests
    await this.enforceRateLimit();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const url = this.buildUrl(query, options);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': USER_AGENT,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.lastRequestTime = Date.now();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} von Photon API`);
      }

      const data = (await response.json()) as PhotonResponse;
      return Result.ok(this.mapResponse(data, options.countryCode));
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(GeoError.format(GEO_ERROR_CODES.SERVICE_UNAVAILABLE, 'Request-Timeout überschritten'));
      }

      throw error; // Netzwerk-Fehler → Circuit Breaker records failure
    }
  }

  /**
   * Baut die Photon API URL zusammen.
   */
  private buildUrl(query: string, options: { lang: string; limit: number; lat?: string; lon?: string; countryCode?: string }): string {
    const params = new URLSearchParams({
      q: query,
      lang: options.lang,
      limit: String(options.limit),
    });

    if (options.lat) {
      params.set('lat', options.lat);
    }
    if (options.lon) {
      params.set('lon', options.lon);
    }

    return `${BASE_URL}?${params.toString()}`;
  }

  /**
   * Mappt die Photon GeoJSON Response auf das Domain-Modell.
   *
   * Filtert optional nach Ländercode, falls angegeben.
   */
  private mapResponse(data: PhotonResponse, countryCode?: string): AddressSucheErgebnis[] {
    let features = data.features ?? [];

    // Ländercode-Filter anwenden (Photon API hat keinen nativen Filter)
    if (countryCode) {
      features = features.filter((f) => f.properties.countrycode?.toLowerCase() === countryCode);
    }

    return features.map((feature) => this.mapFeature(feature));
  }

  /**
   * Mappt ein einzelnes Photon Feature auf ein AddressSucheErgebnis.
   */
  private mapFeature(feature: PhotonFeature): AddressSucheErgebnis {
    const { properties, geometry } = feature;
    const [lon, lat] = geometry.coordinates;

    return {
      strasse: properties.street ?? properties.name ?? '',
      hausnummer: properties.housenumber,
      ort: properties.city ?? '',
      plz: properties.postcode,
      bundesland: properties.state,
      land: properties.country ?? '',
      laengengrad: String(lon),
      breitengrad: String(lat),
    };
  }

  /**
   * Erzwingt den minimalen Abstand zwischen API-Requests.
   *
   * Wartet ggf. die verbleibende Zeit bis zum nächsten erlaubten Request.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      const waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;
      this.logger.debug(`Rate Limit: warte ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}
