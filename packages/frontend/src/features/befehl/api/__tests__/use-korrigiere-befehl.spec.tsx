/**
 * Unit Tests fuer useKorrigiereBefehl Hook
 *
 * Verifiziert:
 * - Korrekter API-Aufruf an befehlControllerKorrigierenVAlpha
 * - Optimistic Update: Original-Befehl wird auf KORRIGIERT gesetzt
 * - Optimistic Update: Korrektur-Befehl wird der Liste hinzugefuegt
 * - Error Rollback: Cache wird bei Fehler zurueckgesetzt
 * - Toast-Notifications bei Success/Error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useKorrigiereBefehl } from '../use-korrigiere-befehl';

// Hoisted mocks
const { mockKorrigieren, mockToast } = vi.hoisted(() => ({
  mockKorrigieren: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock API
vi.mock('@/shared', () => ({
  api: {
    befehle: () => ({
      befehlControllerKorrigierenVAlpha: mockKorrigieren,
    }),
  },
  BefehlDtoStatusEnum: {
    Erteilt: 'ERTEILT',
    Zugestellt: 'ZUGESTELLT',
    Quittiert: 'QUITTIERT',
    Korrigiert: 'KORRIGIERT',
  },
  BefehlDtoBefehlstypEnum: {
    Kurzbefehl: 'KURZBEFEHL',
    Eamzw: 'EAMZW',
    Erweitert: 'ERWEITERT',
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn().mockResolvedValue('Korrektur fehlgeschlagen'),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock queries - schnelle Retries
vi.mock('../queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>();
  return {
    ...actual,
    calculateRetryDelay: () => 0,
  };
});

describe('useKorrigiereBefehl', () => {
  let queryClient: QueryClient;
  const einsatzId = 'einsatz-1';
  const befehlId = 'befehl-1';

  const korrekturDto = {
    empfaenger: [{ name: 'ZF Nord' }],
    befehlsgeber: 'EL',
    erstellerId: 'user-1',
    auftrag: 'Korrektur: Neuer Auftrag',
  };

  const createWrapper = () => {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  /** Befehle-Cache mit Test-Daten vorbelegen */
  const seedCache = () => {
    queryClient.setQueryData(
      ['befehl', 'list', einsatzId],
      [
        {
          id: befehlId,
          nummer: '001',
          auftrag: 'Original-Auftrag',
          status: 'ERTEILT',
          empfaenger: [{ name: 'ZF Nord' }],
        },
        {
          id: 'befehl-2',
          nummer: '002',
          auftrag: 'Anderer Befehl',
          status: 'ERTEILT',
          empfaenger: [],
        },
      ],
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('ruft befehlControllerKorrigierenVAlpha korrekt auf', async () => {
    mockKorrigieren.mockResolvedValue({
      data: { id: 'korrektur-1', nummer: '003' },
    });
    seedCache();

    const { result } = renderHook(() => useKorrigiereBefehl(befehlId, einsatzId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(korrekturDto);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockKorrigieren).toHaveBeenCalledWith({
      id: befehlId,
      korrigiereBefehlDto: korrekturDto,
    });
  });

  it('setzt Original-Befehl optimistisch auf KORRIGIERT', async () => {
    // Mock loest nie auf -> Optimistic Update bleibt bestehen
    mockKorrigieren.mockImplementation(() => new Promise(() => {}));
    seedCache();

    const { result } = renderHook(() => useKorrigiereBefehl(befehlId, einsatzId), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(korrekturDto);
    });

    const cached = queryClient.getQueryData<Array<{ id: string; status: string }>>(['befehl', 'list', einsatzId]);
    const originalBefehl = cached?.find((b) => b.id === befehlId);
    expect(originalBefehl?.status).toBe('KORRIGIERT');

    // Anderer Befehl bleibt unveraendert
    const andererBefehl = cached?.find((b) => b.id === 'befehl-2');
    expect(andererBefehl?.status).toBe('ERTEILT');
  });

  it('fuegt optimistischen Korrektur-Befehl zur Liste hinzu', async () => {
    mockKorrigieren.mockImplementation(() => new Promise(() => {}));
    seedCache();

    const { result } = renderHook(() => useKorrigiereBefehl(befehlId, einsatzId), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(korrekturDto);
    });

    const cached = queryClient.getQueryData<Array<{ id: string; auftrag: string; originalBefehlId?: string }>>(['befehl', 'list', einsatzId]);
    // Erwartet: 3 Eintraege (Original + Anderer + Optimistisch)
    expect(cached?.length).toBe(3);

    // Der optimistische Befehl hat die Korrektur-Daten
    const optimistisch = cached?.find((b) => b.id.startsWith('temp-korrektur-'));
    expect(optimistisch?.auftrag).toBe('Korrektur: Neuer Auftrag');
    expect(optimistisch?.originalBefehlId).toBe(befehlId);
  });

  it('rollt Cache bei Fehler zurueck', async () => {
    mockKorrigieren.mockRejectedValue(new Error('Server error'));
    seedCache();

    const { result } = renderHook(() => useKorrigiereBefehl(befehlId, einsatzId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(korrekturDto);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    const cached = queryClient.getQueryData<Array<{ id: string; status: string }>>(['befehl', 'list', einsatzId]);
    // Nach Rollback: Original-Status ist wieder ERTEILT
    const originalBefehl = cached?.find((b) => b.id === befehlId);
    expect(originalBefehl?.status).toBe('ERTEILT');
    // Kein optimistischer Befehl mehr
    expect(cached?.length).toBe(2);
  });

  it('zeigt Success-Toast bei erfolgreicher Korrektur', async () => {
    mockKorrigieren.mockResolvedValue({
      data: { id: 'korrektur-1', nummer: '003' },
    });
    seedCache();

    const { result } = renderHook(() => useKorrigiereBefehl(befehlId, einsatzId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(korrekturDto);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockToast.success).toHaveBeenCalledWith('Korrektur-Befehl #003 erstellt');
  });

  it('zeigt Error-Toast bei fehlgeschlagener Korrektur', async () => {
    mockKorrigieren.mockRejectedValue(new Error('Server error'));
    seedCache();

    const { result } = renderHook(() => useKorrigiereBefehl(befehlId, einsatzId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(korrekturDto);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Korrektur fehlgeschlagen',
      expect.objectContaining({
        description: 'Korrektur fehlgeschlagen',
      }),
    );
  });
});
