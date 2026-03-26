/**
 * PLZ-Lookup Adapter - Implementierung des IPlzLookupPort via zippopotam.us.
 *
 * HTTP-Client für die zippopotam.us REST API.
 *
 * **API-Spezifikationen:**
 * - Base URL: https://api.zippopotam.us/{countryCode}/{postalCode}
 * - Format: JSON
 * - Auth: Keine (öffentliche API)
 * - Timeout: 5 Sekunden
 *
 * **Caching:**
 * - In-Memory via globalem CACHE_MANAGER (24h TTL)
 * - Cache Key: `plz:{countryCode}:{plz}`
 *
 * **Fehlerbehandlung:**
 * - 404: PLZ nicht gefunden → GEO_001 (kein CB-Failure)
 * - Timeout/Netzwerk: → GEO_003
 * - Nicht unterstütztes Land: → GEO_002
 *
 * @module infrastructure/geo
 * @see IPlzLookupPort - Domain Port Interface
 */

import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Result } from '@domain/common/result';
import type { IPlzLookupPort, PlzLookupErgebnis, PlzOrt } from '@domain/ports/i-plz-lookup.port';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { RESILIENCE } from '@infrastructure/di-tokens';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/** Base URL der zippopotam.us API */
const BASE_URL = 'https://api.zippopotam.us';

/** Timeout für HTTP-Requests in Millisekunden */
const REQUEST_TIMEOUT = 5000;

/** Cache TTL: 24 Stunden in Millisekunden */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Circuit Breaker Service-Name */
const CB_SERVICE_NAME = 'zippopotam';

/**
 * Unterstützte Länder (DACH + nahe EU).
 * Verwendet Kleinbuchstaben für zippopotam.us URL-Format.
 */
const SUPPORTED_COUNTRIES = new Set(['de', 'at', 'ch', 'li', 'lu', 'be', 'nl', 'fr', 'it', 'pl', 'cz', 'sk', 'hu', 'si', 'hr', 'dk']);

/**
 * zippopotam.us API Response Shape.
 */
interface ZippopotamResponse {
  'post code': string;
  country: string;
  'country abbreviation': string;
  places: Array<{
    'place name': string;
    longitude: string;
    latitude: string;
    state: string;
    'state abbreviation': string;
  }>;
}

@Injectable()
export class PlzLookupAdapter implements IPlzLookupPort {
  private readonly logger = new Logger(PlzLookupAdapter.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(RESILIENCE.CIRCUIT_BREAKER) private readonly circuitBreaker: CircuitBreakerService,
  ) {
    this.circuitBreaker.registerIfNotExists(CB_SERVICE_NAME);
  }

  async lookup(landKuerzel: string, plz: string): Promise<Result<PlzLookupErgebnis>> {
    const countryCode = landKuerzel.toLowerCase();

    // Land prüfen
    if (!SUPPORTED_COUNTRIES.has(countryCode)) {
      return Result.fail(GeoError.format(GEO_ERROR_CODES.COUNTRY_NOT_SUPPORTED, `Land '${landKuerzel}' wird nicht unterstützt`));
    }

    // Cache prüfen
    const cacheKey = `plz:${countryCode}:${plz}`;
    const cached = await this.cache.get<PlzLookupErgebnis>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return Result.ok(cached);
    }

    // HTTP-Call via Circuit Breaker (nur Netzwerk-Fehler zählen als CB-Failure)
    const apiResult = await this.circuitBreaker.execute<Result<PlzLookupErgebnis>>(CB_SERVICE_NAME, async () => {
      return this.fetchFromApi(countryCode, plz);
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

    // Leere Ergebnisse nicht cachen (transienter API-Zustand)
    if (fetchResult.value!.orte.length > 0) {
      await this.cache.set(cacheKey, fetchResult.value!, CACHE_TTL_MS);
      this.logger.debug(`Cache SET: ${cacheKey}`);
    }

    return fetchResult;
  }

  /**
   * HTTP-Request an zippopotam.us.
   *
   * 404 wird als Result.fail zurückgegeben (nicht als Exception),
   * damit der Circuit Breaker keinen Failure recorded.
   */
  private async fetchFromApi(countryCode: string, plz: string): Promise<Result<PlzLookupErgebnis>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const url = `${BASE_URL}/${countryCode}/${plz}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 404) {
        // 404 ist kein Service-Fehler — PLZ existiert einfach nicht
        // Wir werfen NICHT, damit der Circuit Breaker dies nicht als Failure zählt
        return Result.fail(GeoError.format(GEO_ERROR_CODES.PLZ_NOT_FOUND, `PLZ '${plz}' nicht gefunden für Land '${countryCode.toUpperCase()}'`));
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} von zippopotam.us`);
      }

      const data = (await response.json()) as ZippopotamResponse;
      return Result.ok(this.mapResponse(data));
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(GeoError.format(GEO_ERROR_CODES.SERVICE_UNAVAILABLE, 'Request-Timeout überschritten'));
      }

      throw error; // Netzwerk-Fehler → Circuit Breaker records failure
    }
  }

  /** Mappt die zippopotam.us Response auf das Domain-Modell. */
  private mapResponse(data: ZippopotamResponse): PlzLookupErgebnis {
    const orte: PlzOrt[] = data.places.map((place) => ({
      ortsname: place['place name'],
      bundesland: place.state,
      bundeslandKuerzel: place['state abbreviation'],
      laengengrad: place.longitude,
      breitengrad: place.latitude,
    }));

    return {
      postleitzahl: data['post code'],
      land: data.country,
      landKuerzel: data['country abbreviation'],
      orte,
    };
  }
}
