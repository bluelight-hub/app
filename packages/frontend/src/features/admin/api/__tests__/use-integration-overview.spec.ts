/**
 * Unit Tests fuer useIntegrationOverview Hook
 *
 * Verifiziert:
 * - Erfolgreicher Datenabruf
 * - Fehlerbehandlung (Retry-Verhalten)
 * - Korrekter Query Key
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_QUERY_KEYS } from '../queries';

const { mockGetOverview } = vi.hoisted(() => ({
  mockGetOverview: vi.fn(),
}));

vi.mock('@/shared', () => ({
  api: {
    adminIntegrations: () => ({
      adminIntegrationsControllerGetOverviewVAlpha: mockGetOverview,
    }),
  },
  ResponseError: class ResponseError extends Error {
    readonly response: Response;
    constructor(response: Response) {
      super(`HTTP ${response.status}`);
      this.response = response;
    }
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { useIntegrationOverview } from '../use-integration-overview';

describe('useIntegrationOverview', () => {
  let queryClient: QueryClient;

  const MOCK_OVERVIEW = {
    integrations: [
      {
        serviceKey: 'hiorg-server',
        displayName: 'HiOrg-Server',
        status: 'verbunden',
        statusLabel: 'Verbunden',
        circuitBreakerState: 'CLOSED',
        failureCount: 0,
        errorRate: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastTestedAt: null,
        hasCredentials: true,
        isActive: true,
        suggestedAction: null,
      },
    ],
  };

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: queryClient }, children);
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchInterval: false },
      },
    });
    vi.clearAllMocks();
    mockGetOverview.mockResolvedValue({ data: MOCK_OVERVIEW });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Erfolgreicher Datenabruf', () => {
    it('laedt Integrationsuebersicht und extrahiert response.data', async () => {
      // Given: API liefert Daten

      // When: Hook gerendert
      const { result } = renderHook(() => useIntegrationOverview(), {
        wrapper: createWrapper(),
      });

      // Then: Daten korrekt geladen
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.data).toEqual(MOCK_OVERVIEW);
      expect(mockGetOverview).toHaveBeenCalledTimes(1);
    });

    it('liefert isLoading=true waehrend des Ladens', () => {
      // Given: API antwortet verzoegert
      mockGetOverview.mockImplementation(() => new Promise(() => {}));

      // When: Hook gerendert
      const { result } = renderHook(() => useIntegrationOverview(), {
        wrapper: createWrapper(),
      });

      // Then: Loading-State aktiv
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('Fehlerbehandlung', () => {
    it('setzt isError=true bei API-Fehler (4xx ohne Retry)', async () => {
      // Given: 4xx Fehler (kein Retry laut Hook-Logik)
      const error4xx = Object.assign(new Error('HTTP 403'), {
        response: { status: 403 },
      });
      mockGetOverview.mockRejectedValue(error4xx);

      // When: Hook gerendert
      const { result } = renderHook(() => useIntegrationOverview(), {
        wrapper: createWrapper(),
      });

      // Then: Fehler-State aktiv
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });

    it('macht keinen Retry bei 4xx Fehlern', async () => {
      // Given: 4xx Fehler (Client-Fehler)
      const error4xx = Object.assign(new Error('HTTP 403'), {
        response: { status: 403 },
      });
      mockGetOverview.mockRejectedValue(error4xx);

      // When: Hook gerendert
      const { result } = renderHook(() => useIntegrationOverview(), {
        wrapper: createWrapper(),
      });

      // Then: Nur 1 Aufruf (kein Retry bei 4xx)
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockGetOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe('Query Key', () => {
    it('verwendet korrekten Query Key fuer Integrationen', () => {
      // Given/When: Query Key abgerufen
      const queryKey = ADMIN_QUERY_KEYS.integrations.overview();

      // Then: Korrekte Struktur
      expect(queryKey).toEqual(['admin', 'integrations', 'overview']);
    });

    it('cacht Daten unter dem korrekten Key', async () => {
      // Given: Hook mit Daten

      // When: Hook gerendert
      const { result } = renderHook(() => useIntegrationOverview(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Then: Cache enthaelt Daten unter korrektem Key
      const cachedData = queryClient.getQueryData(ADMIN_QUERY_KEYS.integrations.overview());
      expect(cachedData).toEqual(MOCK_OVERVIEW);
    });
  });
});
