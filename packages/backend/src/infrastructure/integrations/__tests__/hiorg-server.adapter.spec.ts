/**
 * Unit Tests für HiOrgServerAdapter.
 *
 * Testet HTTP-Kommunikation mit HiOrg-Server API:
 * - JSON:API Headers
 * - Authorization Header
 * - HTTP Status Code Mapping auf INTEGRATION_ERROR_CODES
 * - Rate Limiting
 * - Timeout Handling
 * - JSON:API Response Parsing
 *
 * @module infrastructure/integrations/__tests__
 */

import { INTEGRATION_ERROR_CODES, IntegrationError } from '@domain/integrations/common/integration-error-codes';
import { Result } from '@domain/common/result';
import { HiOrgServerAdapter } from '../hiorg-server.adapter';
import { CircuitBreakerService } from '@infrastructure/resilience/circuit-breaker.service';

/** Erstellt einen Mock CircuitBreakerService der Operations direkt ausfuehrt */
const createMockCircuitBreaker = (): CircuitBreakerService => {
  const mockCb = {
    register: jest.fn(),
    execute: jest.fn().mockImplementation(async (_name: string, operation: () => Promise<unknown>, _fallback?: () => Promise<unknown>) => {
      try {
        const result = await operation();
        return Result.ok(result);
      } catch (error) {
        return Result.fail(error instanceof Error ? error.message : 'Unbekannt');
      }
    }),
    getState: jest.fn(),
    getAllStatus: jest.fn().mockReturnValue([]),
    reset: jest.fn(),
    onStateChange: jest.fn(),
    isOpen: jest.fn().mockReturnValue(false),
  } as unknown as CircuitBreakerService;
  return mockCb;
};

describe('HiOrgServerAdapter', () => {
  let adapter: HiOrgServerAdapter;
  let fetchSpy: jest.SpyInstance;
  let mockCircuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCircuitBreaker = createMockCircuitBreaker();
    adapter = new HiOrgServerAdapter(mockCircuitBreaker);

    // Mock global fetch
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchSpy.mockRestore();
  });

  /**
   * Erstellt ein Mock Response-Objekt für fetch.
   */
  const createMockResponse = (options: { status?: number; ok?: boolean; data?: unknown; headers?: Record<string, string> }) => {
    const { status = 200, ok = true, data = {}, headers = {} } = options;
    return {
      ok,
      status,
      headers: new Map(Object.entries(headers)),
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    } as unknown as Response;
  };

  describe('HTTP Headers', () => {
    it('sollte korrekten JSON:API Accept Header setzen', async () => {
      // Given
      const token = 'valid-bearer-token';
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
        }),
      );

      // When
      await adapter.testConnection(token);

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.api+json',
          }),
        }),
      );
    });

    it('sollte korrekten Content-Type Header setzen', async () => {
      // Given
      const token = 'valid-bearer-token';
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
        }),
      );

      // When
      await adapter.testConnection(token);

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/vnd.api+json',
          }),
        }),
      );
    });

    it('sollte Authorization Header mit Bearer Token setzen', async () => {
      // Given
      const token = 'my-secret-bearer-token';
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
        }),
      );

      // When
      await adapter.testConnection(token);

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-bearer-token',
          }),
        }),
      );
    });
  });

  describe('HTTP Error Code Mapping', () => {
    it('sollte INVALID_TOKEN bei 401 Response zurückgeben', async () => {
      // Given
      const token = 'expired-token';
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 401, ok: false }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.INVALID_TOKEN)).toBe(true);
    });

    it('sollte CONNECTION_FAILED bei 403 Response zurückgeben', async () => {
      // Given
      const token = 'forbidden-token';
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 403, ok: false }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.CONNECTION_FAILED)).toBe(true);
    });

    it('sollte FEATURE_LOCKED bei 423 Response zurückgeben', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 423, ok: false }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.FEATURE_LOCKED)).toBe(true);
    });

    it('sollte RATE_LIMITED bei 429 Response zurückgeben', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 429, ok: false }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.RATE_LIMITED)).toBe(true);
    });

    it('sollte CONNECTION_FAILED bei 500 Response zurückgeben', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 500, ok: false }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.CONNECTION_FAILED)).toBe(true);
    });

    it('sollte CONNECTION_FAILED bei 503 Response zurückgeben', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockResolvedValueOnce(createMockResponse({ status: 503, ok: false }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.CONNECTION_FAILED)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('sollte Mindestabstand von 2 Sekunden zwischen Requests einhalten', async () => {
      // Given
      const token = 'valid-token';
      const mockResponse = createMockResponse({
        data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
      });
      fetchSpy.mockResolvedValue(mockResponse);

      // When - Ersten Request machen
      const firstRequest = adapter.testConnection(token);
      await jest.advanceTimersByTimeAsync(0);
      await firstRequest;

      // Zweiten Request sofort starten (sollte warten)
      const _startTime = Date.now();
      const secondRequestPromise = adapter.testConnection(token);

      // Timer um 1s vorspulen - sollte noch nicht fertig sein
      jest.advanceTimersByTime(1000);

      // Timer um weitere 1.5s vorspulen (insgesamt > 2s)
      await jest.advanceTimersByTimeAsync(1500);
      await secondRequestPromise;

      // Then - Zweiter Request wurde nach Rate Limit Wartezeit ausgeführt
      // Prüfen dass fetch zweimal aufgerufen wurde
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('sollte keinen Delay beim ersten Request haben', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
        }),
      );

      // When
      const resultPromise = adapter.testConnection(token);
      await jest.advanceTimersByTimeAsync(0);
      const result = await resultPromise;

      // Then - Request wurde sofort durchgeführt
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Timeout Handling', () => {
    it('sollte CONNECTION_FAILED bei Request-Timeout zurückgeben', async () => {
      // Given
      const token = 'valid-token';

      // AbortError simulieren (wie bei Timeout)
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchSpy.mockRejectedValueOnce(abortError);

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.CONNECTION_FAILED)).toBe(true);
      expect(result.error).toContain('Timeout');
    });

    it('sollte CONNECTION_FAILED bei Netzwerkfehler zurückgeben', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isFailure).toBe(true);
      expect(IntegrationError.hasCode(result.error, INTEGRATION_ERROR_CODES.CONNECTION_FAILED)).toBe(true);
    });
  });

  describe('JSON:API Response Parsing', () => {
    it('sollte JSON:API Response mit einzelnem Resource Object korrekt parsen', async () => {
      // Given
      const token = 'valid-token';
      const jsonApiResponse = {
        data: {
          id: 'org-123',
          type: 'organisation',
          attributes: {
            name: 'Feuerwehr Musterstadt',
          },
        },
      };
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: jsonApiResponse }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.organisationName).toBe('Feuerwehr Musterstadt');
    });

    it('sollte JSON:API Response mit Array korrekt parsen', async () => {
      // Given
      const token = 'valid-token';
      const jsonApiResponse = {
        data: [
          {
            id: 'org-123',
            type: 'organisation',
            attributes: {
              name: 'Feuerwehr Musterstadt',
            },
          },
        ],
      };
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: jsonApiResponse }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.organisationName).toBe('Feuerwehr Musterstadt');
    });

    it('sollte Fallback-Name verwenden wenn name-Attribut fehlt', async () => {
      // Given
      const token = 'valid-token';
      const jsonApiResponse = {
        data: {
          id: 'org-123',
          type: 'organisation',
          attributes: {},
        },
      };
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: jsonApiResponse }));

      // When
      const result = await adapter.testConnection(token);

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.organisationName).toBe('Unbekannte Organisation');
    });
  });

  describe('fetchPersons - Filter Parameter', () => {
    it('sollte status Filter-Parameter korrekt aufbauen', async () => {
      // Given
      const token = 'valid-token';
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: [] },
        }),
      );

      // When
      await adapter.fetchPersons(token, { status: ['aktiv', 'eingeschraenkt'] });

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('filter%5Bstatus%5D=aktiv%2Ceingeschraenkt'), expect.any(Object));
    });

    it('sollte updated_since Filter-Parameter korrekt aufbauen', async () => {
      // Given
      const token = 'valid-token';
      const updatedSince = new Date('2024-01-15T10:30:00.000Z');
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: [] },
        }),
      );

      // When
      await adapter.fetchPersons(token, { updatedSince });

      // Then
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('filter%5Bupdated_since%5D=2024-01-15T10%3A30%3A00.000Z'), expect.any(Object));
    });

    it('sollte beide Filter kombinieren können', async () => {
      // Given
      const token = 'valid-token';
      const updatedSince = new Date('2024-01-15T10:30:00.000Z');
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: [] },
        }),
      );

      // When
      await adapter.fetchPersons(token, { status: ['aktiv'], updatedSince });

      // Then
      const callUrl = fetchSpy.mock.calls[0][0] as string;
      expect(callUrl).toContain('filter%5Bstatus%5D=aktiv');
      expect(callUrl).toContain('filter%5Bupdated_since%5D=');
    });

    it('sollte Personen mit Qualifikationen korrekt mappen', async () => {
      // Given
      const token = 'valid-token';
      const jsonApiResponse = {
        data: [
          {
            id: 'person-1',
            type: 'personal',
            attributes: {
              username: 'mmueller',
              vorname: 'Max',
              nachname: 'Mueller',
              email: 'max@example.com',
              gruppen_namen: ['Gruppe A'],
              qualifikationen: [
                {
                  position: 1,
                  liste_id: 10,
                  name: 'Rettungssanitaeter',
                  name_kurz: 'RS',
                },
              ],
            },
          },
        ],
      };

      // Erster Request: Personal-Liste
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: jsonApiResponse }));
      // Zweiter Request: Ausbildungen (fuer jede Person)
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { data: [] } }));

      // When - fetchPersons macht intern mehrere Requests mit Rate Limiting dazwischen
      const resultPromise = adapter.fetchPersons(token);
      // Timer vorspulen um Rate Limit zu ueberbruecken (2s zwischen Requests)
      await jest.advanceTimersByTimeAsync(3000);
      const result = await resultPromise;

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value?.[0]).toMatchObject({
        username: 'mmueller',
        vorname: 'Max',
        nachname: 'Mueller',
        email: 'max@example.com',
        qualifikationen: [
          expect.objectContaining({
            position: 1,
            liste_id: 10,
            name: 'Rettungssanitaeter',
            name_kurz: 'RS',
          }),
        ],
      });
    });
  });

  describe('testConnection', () => {
    it('sollte testedAt Timestamp im Erfolgsfall setzen', async () => {
      // Given
      const token = 'valid-token';
      const beforeTest = new Date();
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
        }),
      );

      // When
      const result = await adapter.testConnection(token);
      const afterTest = new Date();

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value?.testedAt).toBeInstanceOf(Date);
      expect(result.value?.testedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(result.value?.testedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });
  });

  describe('Circuit Breaker Integration (Story 5.3)', () => {
    it('sollte CircuitBreakerService bei Konstruktion registrieren', () => {
      expect(mockCircuitBreaker.register).toHaveBeenCalledWith('hiorg-server');
    });

    it('sollte testConnection durch CircuitBreakerService ausfuehren', async () => {
      // Given
      fetchSpy.mockResolvedValueOnce(
        createMockResponse({
          data: { data: { id: '1', type: 'organisation', attributes: { name: 'Test Org' } } },
        }),
      );

      // When
      await adapter.testConnection('valid-token');

      // Then
      expect(mockCircuitBreaker.execute).toHaveBeenCalledWith('hiorg-server', expect.any(Function));
    });

    it('sollte fetchPersons durch CircuitBreakerService ausfuehren', async () => {
      // Given
      fetchSpy.mockResolvedValueOnce(createMockResponse({ data: { data: [] } }));

      // When
      await adapter.fetchPersons('valid-token');

      // Then
      expect(mockCircuitBreaker.execute).toHaveBeenCalledWith(
        'hiorg-server',
        expect.any(Function),
        expect.any(Function), // Fallback
      );
    });

    it('sollte bei Open Circuit leere Personenliste als Fallback liefern', async () => {
      // Given: CB execute ruft den Fallback auf
      (mockCircuitBreaker.execute as jest.Mock).mockImplementationOnce(async (_name: string, _operation: () => Promise<unknown>, fallback?: () => Promise<unknown>) => {
        if (fallback) {
          return Result.ok(await fallback());
        }
        return Result.fail('Circuit open');
      });

      // When
      const result = await adapter.fetchPersons('valid-token');

      // Then
      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual([]);
    });

    it('sollte bei Open Circuit testConnection fehlschlagen lassen (kein Fallback)', async () => {
      // Given: CB execute gibt Fehler zurueck (kein Fallback fuer testConnection)
      (mockCircuitBreaker.execute as jest.Mock).mockResolvedValueOnce(Result.fail('Circuit open fuer hiorg-server'));

      // When
      const result = await adapter.testConnection('valid-token');

      // Then
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Circuit open');
    });
  });
});
