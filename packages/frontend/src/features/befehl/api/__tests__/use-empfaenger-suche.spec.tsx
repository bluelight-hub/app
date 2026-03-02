/**
 * Unit Tests fuer useEmpfaengerSuche Hook
 *
 * Verifiziert:
 * - Query-Key Format stimmt
 * - API wird mit korrekten Parametern aufgerufen
 * - Suche disabled bei weniger als 2 Zeichen
 * - Error-Handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { BEFEHL_QUERY_KEYS } from '../queries';
import { useEmpfaengerSuche } from '../use-empfaenger-suche';

const { mockEmpfaengerSuche } = vi.hoisted(() => ({
  mockEmpfaengerSuche: vi.fn(),
}));

vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerEmpfaengerSucheVAlpha: mockEmpfaengerSuche,
    }),
  },
}));

const EINSATZ_ID = 'einsatz-123';

describe('useEmpfaengerSuche', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Query-Key', () => {
    it('verwendet den korrekten Query-Key via BEFEHL_QUERY_KEYS.empfaengerSuche', () => {
      const key = BEFEHL_QUERY_KEYS.empfaengerSuche('einsatz-1', 'Mue');
      expect(key).toEqual(['befehl', 'empfaenger-suche', 'einsatz-1', 'Mue']);
    });

    it('Query-Key aendert sich bei anderem Suchterm', () => {
      const key1 = BEFEHL_QUERY_KEYS.empfaengerSuche('einsatz-1', 'Mue');
      const key2 = BEFEHL_QUERY_KEYS.empfaengerSuche('einsatz-1', 'Sch');
      expect(key1).not.toEqual(key2);
    });

    it('Query-Key aendert sich bei anderer einsatzId', () => {
      const key1 = BEFEHL_QUERY_KEYS.empfaengerSuche('einsatz-1', 'Mue');
      const key2 = BEFEHL_QUERY_KEYS.empfaengerSuche('einsatz-2', 'Mue');
      expect(key1).not.toEqual(key2);
    });
  });

  describe('enabled-Logik', () => {
    it('fuehrt keine Suche aus bei leerem Suchterm', () => {
      renderHook(() => useEmpfaengerSuche(EINSATZ_ID, ''), { wrapper: createWrapper() });
      expect(mockEmpfaengerSuche).not.toHaveBeenCalled();
    });

    it('fuehrt keine Suche aus bei nur 1 Zeichen', () => {
      renderHook(() => useEmpfaengerSuche(EINSATZ_ID, 'M'), { wrapper: createWrapper() });
      expect(mockEmpfaengerSuche).not.toHaveBeenCalled();
    });

    it('fuehrt Suche aus ab 2 Zeichen', async () => {
      mockEmpfaengerSuche.mockResolvedValue({ data: [] });

      const { result } = renderHook(() => useEmpfaengerSuche(EINSATZ_ID, 'Mu'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockEmpfaengerSuche).toHaveBeenCalledWith({
        q: 'Mu',
        einsatzId: EINSATZ_ID,
      });
    });
  });

  describe('API-Aufruf', () => {
    it('gibt Ergebnisse korrekt zurueck', async () => {
      const mockResults = [
        { id: '1', name: 'Mueller', rolle: 'GF', quelle: 'EINSATZ' },
        { id: '2', name: 'Rotkreuz 83/1', rolle: 'Fahrzeug', quelle: 'EINSATZ_FAHRZEUG' },
        { id: '3', name: 'Musterfrau', rolle: 'ZF', userId: 'user-1', quelle: 'STAMMDATEN' },
      ];
      mockEmpfaengerSuche.mockResolvedValue({ data: mockResults });

      const { result } = renderHook(() => useEmpfaengerSuche(EINSATZ_ID, 'Mu'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResults);
    });

    it('setzt isError bei API-Fehler', async () => {
      mockEmpfaengerSuche.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useEmpfaengerSuche(EINSATZ_ID, 'Mu'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
