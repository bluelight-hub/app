import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mocks für den generierten API-Client. Alle vier Sicherheitsregel-Endpoints
 * werden hier gemockt, damit Tests unabhängig vom HTTP-Client laufen. Der
 * `eigenschutz()`-Factory-Call gibt bei jedem Aufruf ein Objekt mit denselben
 * Mock-Funktions-Referenzen zurück — analog zum `vorlagen-hooks.spec.tsx`-
 * Muster.
 */
const mockListRegeln = vi.fn();
const mockGetRegel = vi.fn();
const mockCreateRegeln = vi.fn();
const mockUpdateRegel = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      sicherheitsregelControllerListRegelnVAlpha: mockListRegeln,
      sicherheitsregelControllerGetRegelVAlpha: mockGetRegel,
      sicherheitsregelControllerCreateRegelnVAlpha: mockCreateRegeln,
      sicherheitsregelControllerUpdateRegelVAlpha: mockUpdateRegel,
    }),
  },
}));

import {
  EIGENSCHUTZ_QUERY_KEYS,
  SicherheitsregelConflictError,
  extractSicherheitsregelConflictError,
  useCreateSicherheitsregel,
  useSicherheitsregel,
  useSicherheitsregeln,
  useUpdateSicherheitsregel,
} from '../queries';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const sampleRegel = {
  id: 'r-1',
  einsatzId: 'e-1',
  einheitId: null,
  einsatzweit: true,
  titel: 'Absperrung 20 m',
  inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
  version: 1,
  erstelltAm: '2026-04-24T08:00:00Z',
  erstelltVonUserId: 'u-1',
  aktualisiertAm: '2026-04-24T08:00:00Z',
  aktualisiertVonUserId: 'u-1',
  propagationGroupId: 'pg-1',
};

describe('EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln (Story 2.6 Task 7.2)', () => {
  it('baut einen gemeinsamen Prefix-Key für Listen-Invalidation (ohne einheitId)', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln('e-1')).toEqual(['eigenschutz', 'e-1', 'sicherheitsregeln', 'list']);
  });

  it('hängt einen strukturierten `einheitId`-Filter an, wenn gesetzt (Story 2.7 vorbereitet)', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln('e-1', 'einheit-1')).toEqual(['eigenschutz', 'e-1', 'sicherheitsregeln', 'list', { einheitId: 'einheit-1' }]);
  });

  it('liefert einen separaten Detail-Key pro Regel-ID', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.sicherheitsregel('e-1', 'r-7')).toEqual(['eigenschutz', 'e-1', 'sicherheitsregeln', 'detail', 'r-7']);
  });
});

describe('useSicherheitsregeln (Story 2.6 AC6)', () => {
  beforeEach(() => {
    mockListRegeln.mockReset();
  });

  it('ist deaktiviert bei leerer einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSicherheitsregeln(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListRegeln).not.toHaveBeenCalled();
  });

  it('entpackt `data` aus dem Wrapped-Response und leitet einsatzId + einheitId durch', async () => {
    mockListRegeln.mockResolvedValueOnce({ data: [sampleRegel], meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSicherheitsregeln('e-42', 'einheit-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.id).toBe('r-1');
    expect(mockListRegeln).toHaveBeenCalledWith({ einsatzId: 'e-42', einheitId: 'einheit-1' });
  });

  it('übergibt `einheitId: undefined`, wenn kein Filter gesetzt ist', async () => {
    mockListRegeln.mockResolvedValueOnce({ data: [], meta: {} });
    const { wrapper } = makeWrapper();
    renderHook(() => useSicherheitsregeln('e-1'), { wrapper });

    await waitFor(() => expect(mockListRegeln).toHaveBeenCalled());
    expect(mockListRegeln).toHaveBeenCalledWith({ einsatzId: 'e-1', einheitId: undefined });
  });

  it('fallbackt auf leeres Array bei fehlendem `data`-Feld (Envelope-Drift)', async () => {
    mockListRegeln.mockResolvedValueOnce({ meta: {} } as unknown as { data: []; meta: object });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSicherheitsregeln('e-7'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('trägt meta.silentError für die Zero-Toast-Policy (UX-DR21)', async () => {
    mockListRegeln.mockResolvedValueOnce({ data: [], meta: {} });
    const { client, wrapper } = makeWrapper();
    renderHook(() => useSicherheitsregeln('e-99'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln('e-99') });
      expect(cached?.meta?.silentError).toBe(true);
    });
  });
});

describe('useSicherheitsregel (Story 2.6 Task 7.2 — Edit-Drawer-Vorab-Ladung)', () => {
  beforeEach(() => {
    mockGetRegel.mockReset();
  });

  it('ist deaktiviert bei leerer einsatzId oder id', () => {
    const { wrapper } = makeWrapper();
    const hookA = renderHook(() => useSicherheitsregel('', 'r-1'), { wrapper });
    const hookB = renderHook(() => useSicherheitsregel('e-1', ''), { wrapper });

    expect(hookA.result.current.fetchStatus).toBe('idle');
    expect(hookB.result.current.fetchStatus).toBe('idle');
    expect(mockGetRegel).not.toHaveBeenCalled();
  });

  it('lädt das Detail-DTO und reicht einsatzId + id durch', async () => {
    mockGetRegel.mockResolvedValueOnce({ data: sampleRegel, meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useSicherheitsregel('e-1', 'r-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('r-1');
    expect(result.current.data?.version).toBe(1);
    expect(mockGetRegel).toHaveBeenCalledWith({ einsatzId: 'e-1', id: 'r-1' });
  });
});

describe('useCreateSicherheitsregel (Story 2.6 AC2 — Fanout)', () => {
  beforeEach(() => {
    mockCreateRegeln.mockReset();
  });

  it('transformiert die diskriminierte Einsatzweit-Union in das flache DTO (ohne einheitIds)', async () => {
    mockCreateRegeln.mockResolvedValueOnce({ data: [sampleRegel], meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateSicherheitsregel('e-1'), { wrapper });

    await result.current.mutateAsync({
      titel: 'Absperrung 20 m',
      inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
      einsatzweit: true,
    });

    expect(mockCreateRegeln).toHaveBeenCalledWith({
      einsatzId: 'e-1',
      createSicherheitsregelDto: {
        titel: 'Absperrung 20 m',
        inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
        einsatzweit: true,
      },
    });
  });

  it('transformiert die Einheiten-Variante und reicht `einheitIds` durch (Multi-Einheit-Fanout)', async () => {
    mockCreateRegeln.mockResolvedValueOnce({
      data: [sampleRegel, { ...sampleRegel, id: 'r-2', einheitId: 'einheit-2', einsatzweit: false }],
      meta: {},
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateSicherheitsregel('e-1'), { wrapper });

    await result.current.mutateAsync({
      titel: 'Absperrung 20 m',
      inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
      einsatzweit: false,
      einheitIds: ['einheit-1', 'einheit-2'],
    });

    expect(mockCreateRegeln).toHaveBeenCalledWith({
      einsatzId: 'e-1',
      createSicherheitsregelDto: {
        titel: 'Absperrung 20 m',
        inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
        einsatzweit: false,
        einheitIds: ['einheit-1', 'einheit-2'],
      },
    });
  });

  it('surface den Fanout-Response als Array von DTOs (Fanout-Semantik, AC6)', async () => {
    const fanoutResponse = {
      data: [
        { ...sampleRegel, id: 'r-a', einheitId: 'einheit-1', einsatzweit: false, propagationGroupId: 'pg-7' },
        { ...sampleRegel, id: 'r-b', einheitId: 'einheit-2', einsatzweit: false, propagationGroupId: 'pg-7' },
      ],
      meta: {},
    };
    mockCreateRegeln.mockResolvedValueOnce(fanoutResponse);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateSicherheitsregel('e-1'), { wrapper });

    const returned = await result.current.mutateAsync({
      titel: 'Absperrung 20 m',
      inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
      einsatzweit: false,
      einheitIds: ['einheit-1', 'einheit-2'],
    });

    expect(Array.isArray(returned)).toBe(true);
    expect(returned).toHaveLength(2);
    expect(returned[0]?.propagationGroupId).toBe('pg-7');
    expect(returned[1]?.propagationGroupId).toBe('pg-7');
  });

  it('invalidiert die Listen-Query nach erfolgreichem Create (prefix-matching auf alle einheitId-Varianten)', async () => {
    mockCreateRegeln.mockResolvedValueOnce({ data: [sampleRegel], meta: {} });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateSicherheitsregel('e-1'), { wrapper });

    await result.current.mutateAsync({
      titel: 'Absperrung 20 m',
      inhalt: 'Sichtkontakt nach Funkspruch einhalten.',
      einsatzweit: true,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln('e-1'),
      });
    });
  });
});

describe('useUpdateSicherheitsregel (Story 2.6 AC3 + AC4)', () => {
  beforeEach(() => {
    mockUpdateRegel.mockReset();
  });

  it('sendet titel + inhalt + Zuordnung + expectedVersion an den Update-Endpoint', async () => {
    mockUpdateRegel.mockResolvedValueOnce({ data: [{ ...sampleRegel, version: 2 }], meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSicherheitsregel('e-1'), { wrapper });

    await result.current.mutateAsync({
      id: 'r-1',
      titel: 'Absperrung 30 m',
      inhalt: 'Neuer Text.',
      einsatzweit: false,
      einheitIds: ['einheit-9'],
      expectedVersion: 1,
    });

    expect(mockUpdateRegel).toHaveBeenCalledWith({
      einsatzId: 'e-1',
      id: 'r-1',
      updateSicherheitsregelDto: {
        titel: 'Absperrung 30 m',
        inhalt: 'Neuer Text.',
        einsatzweit: false,
        einheitIds: ['einheit-9'],
        expectedVersion: 1,
      },
    });
  });

  it('invalidiert Listen- und Detail-Query nach erfolgreichem Update', async () => {
    mockUpdateRegel.mockResolvedValueOnce({ data: [{ ...sampleRegel, version: 2 }], meta: {} });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateSicherheitsregel('e-1'), { wrapper });

    await result.current.mutateAsync({
      id: 'r-1',
      titel: 'Neu',
      inhalt: 'Neu',
      einsatzweit: true,
      expectedVersion: 1,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln('e-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregel('e-1', 'r-1') });
    });
  });

  it('reicht Re-Wire-Response (Array aus neu erzeugten Rows mit stabiler propagationGroupId) durch', async () => {
    const reWireResponse = {
      data: [
        { ...sampleRegel, id: 'r-b', einheitId: 'einheit-2', einsatzweit: false, propagationGroupId: 'pg-stable' },
        { ...sampleRegel, id: 'r-c', einheitId: 'einheit-3', einsatzweit: false, propagationGroupId: 'pg-stable' },
      ],
      meta: {},
    };
    mockUpdateRegel.mockResolvedValueOnce(reWireResponse);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSicherheitsregel('e-1'), { wrapper });

    const returned = await result.current.mutateAsync({
      id: 'r-a',
      titel: 'Regel X',
      inhalt: 'Inhalt X',
      einsatzweit: false,
      einheitIds: ['einheit-2', 'einheit-3'],
      expectedVersion: 1,
    });

    expect(returned).toHaveLength(2);
    expect(returned.every((row) => row.propagationGroupId === 'pg-stable')).toBe(true);
  });

  it('mappt 409 auf typsierten SicherheitsregelConflictError mit currentVersion + attemptedVersion', async () => {
    mockUpdateRegel.mockRejectedValueOnce({
      response: { status: 409, data: { context: { currentVersion: 5, attemptedVersion: 1 } } },
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSicherheitsregel('e-1'), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: 'r-1',
        titel: 'Neu',
        inhalt: 'Neu',
        einsatzweit: true,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      currentVersion: 5,
      attemptedVersion: 1,
    });
  });

  it('propagiert Nicht-409-Fehler unverändert (z. B. 422 Business-Rule)', async () => {
    const raw = { response: { status: 422, data: { message: 'BusinessRule:NoChangesDetected' } } };
    mockUpdateRegel.mockRejectedValueOnce(raw);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSicherheitsregel('e-1'), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: 'r-1',
        titel: 'Neu',
        inhalt: 'Neu',
        einsatzweit: true,
        expectedVersion: 1,
      }),
    ).rejects.toBe(raw);
  });
});

describe('extractSicherheitsregelConflictError (Story 2.6 AC3)', () => {
  it('extrahiert currentVersion + attemptedVersion aus validem 409-Context', () => {
    const raw = {
      response: {
        status: 409,
        data: {
          statusCode: 409,
          error: 'Conflict',
          message: 'ConflictDetected:Sicherheitsregel',
          context: { currentVersion: 7, attemptedVersion: 3 },
        },
      },
    };
    const extracted = extractSicherheitsregelConflictError(raw, 3);

    expect(extracted).toBeInstanceOf(SicherheitsregelConflictError);
    expect(extracted?.currentVersion).toBe(7);
    expect(extracted?.attemptedVersion).toBe(3);
    expect(extracted?.statusCode).toBe(409);
    expect(extracted?.originalError).toBe(raw);
  });

  it('fallbackt auf undefined currentVersion bei fehlendem Feld (Reload-Failure-Pfad)', () => {
    const raw = {
      response: {
        status: 409,
        data: { context: { attemptedVersion: 3 } },
      },
    };
    const extracted = extractSicherheitsregelConflictError(raw, 3);

    expect(extracted).toBeInstanceOf(SicherheitsregelConflictError);
    expect(extracted?.currentVersion).toBeUndefined();
    expect(extracted?.attemptedVersion).toBe(3);
  });

  it('fallbackt auf undefined bei invaliden Typen (Zod-Guard non-throwing)', () => {
    const raw = {
      response: {
        status: 409,
        data: { context: { currentVersion: 'seven', attemptedVersion: 3 } },
      },
    };
    const extracted = extractSicherheitsregelConflictError(raw, 3);

    expect(extracted).toBeInstanceOf(SicherheitsregelConflictError);
    expect(extracted?.currentVersion).toBeUndefined();
  });

  it('liefert null bei Nicht-409-Fehlern, damit der Hook den Original-Error weiterwirft', () => {
    expect(extractSicherheitsregelConflictError({ response: { status: 422 } }, 3)).toBeNull();
    expect(extractSicherheitsregelConflictError({ response: { status: 500 } }, 3)).toBeNull();
    expect(extractSicherheitsregelConflictError(new Error('network boom'), 3)).toBeNull();
    expect(extractSicherheitsregelConflictError(null, 3)).toBeNull();
  });
});
