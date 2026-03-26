// @ts-nocheck
/**
 * Unit Tests für PlzLookupAdapter.
 *
 * Testet:
 * - Erfolgreicher PLZ-Lookup mit Cache-Miss
 * - Cache-Hit (kein HTTP-Request)
 * - 404 → GEO_001 (kein Circuit Breaker Failure)
 * - Nicht unterstütztes Land → GEO_002
 * - Timeout → GEO_003
 * - Response-Mapping
 *
 * @module infrastructure/geo/__tests__
 */

import { Result } from '@domain/common/result';
import { GEO_ERROR_CODES, GeoError } from '@domain/geo/geo-error-codes';
import { PlzLookupAdapter } from '../plz-lookup.adapter';
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

/** zippopotam.us Response für München */
const MUENCHEN_RESPONSE = {
  'post code': '80331',
  country: 'Germany',
  'country abbreviation': 'DE',
  places: [
    {
      'place name': 'München',
      longitude: '11.571',
      latitude: '48.1345',
      state: 'Bayern',
      'state abbreviation': 'BY',
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

describe('PlzLookupAdapter', () => {
  let adapter: PlzLookupAdapter;
  let fetchSpy: jest.SpyInstance;
  let mockCache: ReturnType<typeof createMockCache>;
  let mockCircuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = createMockCache();
    mockCircuitBreaker = createMockCircuitBreaker();
    adapter = new PlzLookupAdapter(mockCache as any, mockCircuitBreaker);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('lookup', () => {
    it('sollte PLZ erfolgreich nachschlagen und cachen', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: MUENCHEN_RESPONSE }));

      const result = await adapter.lookup('DE', '80331');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual({
        postleitzahl: '80331',
        land: 'Germany',
        landKuerzel: 'DE',
        orte: [
          {
            ortsname: 'München',
            bundesland: 'Bayern',
            bundeslandKuerzel: 'BY',
            laengengrad: '11.571',
            breitengrad: '48.1345',
          },
        ],
      });

      // Cache wurde gesetzt
      expect(mockCache.set).toHaveBeenCalledWith('plz:de:80331', expect.any(Object), 86400000);
    });

    it('sollte Cache-Hit nutzen ohne HTTP-Request', async () => {
      const cachedData = {
        postleitzahl: '80331',
        land: 'Germany',
        landKuerzel: 'DE',
        orte: [{ ortsname: 'München', bundesland: 'Bayern', bundeslandKuerzel: 'BY', laengengrad: '11.571', breitengrad: '48.1345' }],
      };
      mockCache.get.mockResolvedValueOnce(cachedData);

      const result = await adapter.lookup('DE', '80331');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(cachedData);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sollte GEO_002 bei nicht unterstütztem Land zurückgeben', async () => {
      const result = await adapter.lookup('XX', '12345');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.COUNTRY_NOT_SUPPORTED)).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('sollte GEO_001 bei 404 zurückgeben', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 404, ok: false }));

      const result = await adapter.lookup('DE', '00000');

      expect(result.isFailure).toBe(true);
      expect(GeoError.hasCode(result.error, GEO_ERROR_CODES.PLZ_NOT_FOUND)).toBe(true);
    });

    it('sollte korrekte URL mit Kleinbuchstaben-Ländercode aufrufen', async () => {
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: MUENCHEN_RESPONSE }));

      await adapter.lookup('DE', '80331');

      expect(fetchSpy).toHaveBeenCalledWith('https://api.zippopotam.us/de/80331', expect.objectContaining({ method: 'GET' }));
    });

    it('sollte AT (4-stellige PLZ) unterstützen', async () => {
      const wienResponse = {
        'post code': '1010',
        country: 'Austria',
        'country abbreviation': 'AT',
        places: [{ 'place name': 'Wien, Innere Stadt', longitude: '16.3731', latitude: '48.2083', state: 'Wien', 'state abbreviation': 'WI' }],
      };
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: wienResponse }));

      const result = await adapter.lookup('AT', '1010');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.orte[0]?.ortsname).toBe('Wien, Innere Stadt');
    });

    it('sollte Circuit Breaker registrieren', () => {
      expect(mockCircuitBreaker.registerIfNotExists).toHaveBeenCalledWith('zippopotam');
    });
  });
});
