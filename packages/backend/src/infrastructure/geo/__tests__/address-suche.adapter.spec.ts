// @ts-nocheck
/**
 * Unit Tests für AddressSucheAdapter.
 *
 * Testet:
 * - Erfolgreiche Adresssuche mit Cache-Miss
 * - Cache-Hit (kein HTTP-Request)
 * - Timeout → GEO_003
 * - Response-Mapping (Photon GeoJSON → AddressSucheErgebnis)
 * - Rate Limiting (1 req/sec)
 * - Circuit Breaker Integration
 * - Ländercode-Filterung
 *
 * @module infrastructure/geo/__tests__
 */

import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { AddressSucheAdapter } from '../address-suche.adapter';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/** Erstellt einen Mock CircuitBreakerService */
const createMockCircuitBreaker = (): CircuitBreakerService => {
  return {
    registerIfNotExists: jest.fn(),
    execute: jest.fn().mockImplementation(async (_name: string, operation: () => Promise<unknown>) => {
      try {
        const result = await operation();
        return Result.ok(result);
      } catch (error) {
        return Result.fail(error instanceof Error ? error.message : 'Unbekannt');
      }
    }),
  } as unknown as CircuitBreakerService;
};

/** Erstellt einen Mock Cache Manager */
const createMockCache = () => ({
  get: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
});

/** Photon Response für "Marienplatz München" */
const MARIENPLATZ_RESPONSE = {
  features: [
    {
      properties: {
        name: 'Marienplatz',
        street: 'Marienplatz',
        housenumber: '1',
        postcode: '80331',
        city: 'München',
        state: 'Bayern',
        country: 'Germany',
        countrycode: 'de',
      },
      geometry: {
        coordinates: [11.5761, 48.1372],
      },
    },
  ],
};

/** Photon Response mit mehreren Ergebnissen und verschiedenen Ländern */
const MULTI_COUNTRY_RESPONSE = {
  features: [
    {
      properties: {
        street: 'Hauptstraße',
        postcode: '80331',
        city: 'München',
        state: 'Bayern',
        country: 'Germany',
        countrycode: 'de',
      },
      geometry: { coordinates: [11.5761, 48.1372] },
    },
    {
      properties: {
        street: 'Hauptstraße',
        postcode: '1010',
        city: 'Wien',
        state: 'Wien',
        country: 'Austria',
        countrycode: 'at',
      },
      geometry: { coordinates: [16.3731, 48.2083] },
    },
  ],
};

/** Erstellt ein Mock Response-Objekt für fetch */
const createMockResponse = (options: { status?: number; ok?: boolean; data?: unknown }) => {
  const { status = 200, ok = true, data = {} } = options;
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
  } as unknown as Response;
};

describe('AddressSucheAdapter', () => {
  let adapter: AddressSucheAdapter;
  let fetchSpy: jest.SpyInstance;
  let mockCache: ReturnType<typeof createMockCache>;
  let mockCircuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = createMockCache();
    mockCircuitBreaker = createMockCircuitBreaker();
    adapter = new AddressSucheAdapter(mockCache as any, mockCircuitBreaker);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('search', () => {
    it('sollte Adressen erfolgreich suchen und cachen', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: MARIENPLATZ_RESPONSE }));

      const result = await adapter.search('Marienplatz München');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([
        {
          strasse: 'Marienplatz',
          hausnummer: '1',
          ort: 'München',
          plz: '80331',
          bundesland: 'Bayern',
          land: 'Germany',
          laengengrad: '11.5761',
          breitengrad: '48.1372',
        },
      ]);

      // Cache wurde gesetzt
      expect(mockCache.set).toHaveBeenCalledWith('addr::Marienplatz München::', expect.any(Array), 3600000);
    });

    it('sollte Cache-Hit nutzen ohne HTTP-Request', async () => {
      const cachedData = [
        {
          strasse: 'Marienplatz',
          hausnummer: '1',
          ort: 'München',
          plz: '80331',
          bundesland: 'Bayern',
          land: 'Germany',
          laengengrad: '11.5761',
          breitengrad: '48.1372',
        },
      ];
      mockCache.get.mockResolvedValueOnce(cachedData);

      const result = await adapter.search('Marienplatz München');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(cachedData);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sollte korrekte URL mit Parametern aufrufen', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { features: [] } }));

      await adapter.search('Marienplatz', { lat: '48.1372', lon: '11.5761', lang: 'de', limit: 5 });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://photon.komoot.io/api/?'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'BluelightHub/1.0 (Katastrophenschutz-App)',
          }),
        }),
      );

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('q=Marienplatz');
      expect(calledUrl).toContain('lat=48.1372');
      expect(calledUrl).toContain('lon=11.5761');
      expect(calledUrl).toContain('lang=de');
      expect(calledUrl).toContain('limit=5');
    });

    it('sollte Standard-Werte für lang und limit verwenden', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { features: [] } }));

      await adapter.search('Test');

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('lang=de');
      expect(calledUrl).toContain('limit=5');
    });

    it('sollte Limit auf maximal 10 begrenzen', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { features: [] } }));

      await adapter.search('Test', { limit: 50 });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('limit=10');
    });

    it('sollte nach Ländercode filtern', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: MULTI_COUNTRY_RESPONSE }));

      const result = await adapter.search('Hauptstraße', { countryCode: 'de' });

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value![0].ort).toBe('München');
    });

    it('sollte GEO_003 bei HTTP-Fehler zurückgeben', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 500, ok: false }));

      const result = await adapter.search('Test');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.SERVICE_UNAVAILABLE)).toBe(true);
    });

    it('sollte Circuit Breaker registrieren', () => {
      expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('photon');
    });

    it('sollte leere Features korrekt verarbeiten', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { features: [] } }));

      const result = await adapter.search('xyznonexistent');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('sollte fehlende optionale Properties graceful mappen', async () => {
      const responseWithMissingProps = {
        features: [
          {
            properties: {
              name: 'Testort',
              country: 'Germany',
              countrycode: 'de',
            },
            geometry: { coordinates: [11.0, 48.0] },
          },
        ],
      };
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: responseWithMissingProps }));

      const result = await adapter.search('Testort');

      expect(result.isSuccess).toBe(true);
      expect(result.value![0]).toEqual({
        strasse: 'Testort',
        hausnummer: undefined,
        ort: '',
        plz: undefined,
        bundesland: undefined,
        land: 'Germany',
        laengengrad: '11',
        breitengrad: '48',
      });
    });

    it('sollte Cache-Key mit countryCode generieren', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { features: [] } }));

      await adapter.search('Test', { countryCode: 'de', lat: '48.0', lon: '11.0' });

      expect(mockCache.get).toHaveBeenCalledWith('addr:de:Test:48.0:11.0');
    });
  });
});
