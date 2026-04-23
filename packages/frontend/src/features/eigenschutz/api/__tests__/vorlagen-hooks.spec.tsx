import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mocks für den generierten API-Client. Alle drei Gefährdungsbeurteilungs-
 * Endpoints werden hier gemockt, damit Tests unabhängig vom HTTP-Client
 * laufen. Der `eigenschutz()`-Factory-Call gibt bei jedem Aufruf ein
 * Objekt mit denselben Mock-Funktions-Referenzen zurück.
 */
const mockGetHealth = vi.fn();
const mockListVorlagen = vi.fn();
const mockCreateBeurteilung = vi.fn();
const mockGetBeurteilung = vi.fn();
const mockUpdateItems = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzHealthControllerGetHealthVAlpha: mockGetHealth,
      gefaehrdungsbeurteilungControllerListVorlagenVAlpha: mockListVorlagen,
      gefaehrdungsbeurteilungControllerCreateBeurteilungVAlpha: mockCreateBeurteilung,
      gefaehrdungsbeurteilungControllerGetBeurteilungVAlpha: mockGetBeurteilung,
      gefaehrdungsbeurteilungControllerUpdateItemsVAlpha: mockUpdateItems,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS, useCreateGefaehrdungsbeurteilung, useGefaehrdungsbeurteilung, useGefaehrdungsbeurteilungVorlagen, useUpdateGefaehrdungsbeurteilungItems } from '../queries';

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

describe('EIGENSCHUTZ_QUERY_KEYS (Story 2.1)', () => {
  it('baut hierarchische Keys für Vorlagen-, Liste- und Detail-Caches', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungsVorlagen('e-1')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungs-vorlagen']);
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen('e-1')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungen']);
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungen', 'b-7']);
  });
});

describe('useGefaehrdungsbeurteilungVorlagen (Story 2.1 AC4)', () => {
  beforeEach(() => {
    mockListVorlagen.mockReset();
  });

  it('ist deaktiviert bei leerer einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungVorlagen(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListVorlagen).not.toHaveBeenCalled();
  });

  it('entpackt die `data`-Property des Wrapped-Response und leitet einsatzId durch', async () => {
    mockListVorlagen.mockResolvedValueOnce({
      data: [{ id: 'v-1', slug: 'verkehrsunfall', name: 'Verkehrsunfall', szenario: 'verkehrsunfall', items: [], version: 1, aktiv: true, erstelltAm: '2026-04-22T00:00:00Z' }],
      meta: {},
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungVorlagen('e-42'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.slug).toBe('verkehrsunfall');
    expect(mockListVorlagen).toHaveBeenCalledWith({ einsatzId: 'e-42' });
  });

  it('fallbackt auf leeres Array, wenn der Envelope unerwartet `data` nicht liefert', async () => {
    mockListVorlagen.mockResolvedValueOnce({ meta: {} } as unknown as { data: []; meta: object });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungVorlagen('e-7'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('trägt meta.silentError für die Plattform-Toast-Suppression (UX-DR21)', async () => {
    mockListVorlagen.mockResolvedValueOnce({ data: [], meta: {} });
    const { client, wrapper } = makeWrapper();
    renderHook(() => useGefaehrdungsbeurteilungVorlagen('e-99'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungsVorlagen('e-99'),
      });
      expect(cached?.meta?.silentError).toBe(true);
    });
  });

  describe('retry-Policy', () => {
    async function readRetryFn(): Promise<(failureCount: number, error: unknown) => boolean> {
      mockListVorlagen.mockResolvedValueOnce({ data: [], meta: {} });
      const { client, wrapper } = makeWrapper();
      renderHook(() => useGefaehrdungsbeurteilungVorlagen('e-retry'), { wrapper });

      await waitFor(() => {
        const cached = client.getQueryCache().find({
          queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungsVorlagen('e-retry'),
        });
        expect(cached).toBeDefined();
      });
      const query = client.getQueryCache().find({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungsVorlagen('e-retry'),
      });
      const retryOption = query?.options.retry;
      if (typeof retryOption !== 'function') {
        throw new Error('retry muss für diese Query eine Funktion sein');
      }
      return retryOption as (failureCount: number, error: unknown) => boolean;
    }

    it('retriet maximal 2× bei Nicht-403-Fehlern (failureCount < 2)', async () => {
      const retry = await readRetryFn();
      expect(retry(0, { response: { status: 500 } })).toBe(true);
      expect(retry(1, { response: { status: 500 } })).toBe(true);
      expect(retry(2, { response: { status: 500 } })).toBe(false);
    });

    it('retriet NICHT bei 403 (Berechtigung fehlt dauerhaft, Zero-Toast-Drawer übernimmt)', async () => {
      const retry = await readRetryFn();
      expect(retry(0, { response: { status: 403 } })).toBe(false);
      expect(retry(5, { response: { status: 403 } })).toBe(false);
    });
  });
});

describe('useCreateGefaehrdungsbeurteilung (Story 2.1 AC5)', () => {
  beforeEach(() => {
    mockCreateBeurteilung.mockReset();
  });

  const sampleResponse = {
    data: {
      id: 'b-123',
      einsatzId: 'e-1',
      einheitId: 'einheit-1',
      vorlageId: 'v-1',
      gefahrenzoneId: null,
      items: [],
      version: 1,
      erstelltAm: '2026-04-22T00:00:00Z',
    },
    meta: {},
  };

  it('leitet den Request-Body unter `createGefaehrdungsbeurteilungDto` korrekt weiter', async () => {
    mockCreateBeurteilung.mockResolvedValueOnce(sampleResponse);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateGefaehrdungsbeurteilung('e-1'), { wrapper });

    await result.current.mutateAsync({
      einheitId: 'einheit-1',
      vorlageId: 'v-1',
      gefahrenzoneId: null,
    });

    expect(mockCreateBeurteilung).toHaveBeenCalledWith({
      einsatzId: 'e-1',
      createGefaehrdungsbeurteilungDto: {
        einheitId: 'einheit-1',
        vorlageId: 'v-1',
        // null → undefined, weil der generierte Client nur `string | undefined` akzeptiert.
        gefahrenzoneId: undefined,
      },
    });
  });

  it('entpackt `data` aus der Response', async () => {
    mockCreateBeurteilung.mockResolvedValueOnce(sampleResponse);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useCreateGefaehrdungsbeurteilung('e-1'), { wrapper });

    const returned = await result.current.mutateAsync({
      einheitId: 'einheit-1',
    });

    expect(returned).toEqual(sampleResponse.data);
  });

  it('invalidiert die Listen-Query nach erfolgreichem Create', async () => {
    mockCreateBeurteilung.mockResolvedValueOnce(sampleResponse);
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateGefaehrdungsbeurteilung('e-1'), { wrapper });

    await result.current.mutateAsync({ einheitId: 'einheit-1' });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen('e-1'),
      });
    });
  });

  it('stellt den Listen-Cache nach Fehler aus dem Snapshot wieder her', async () => {
    mockCreateBeurteilung.mockRejectedValueOnce(new Error('boom'));
    const { client, wrapper } = makeWrapper();
    const initialList = [
      {
        id: 'vorhanden',
        einsatzId: 'e-1',
        einheitId: 'einheit-1',
        vorlageId: null,
        gefahrenzoneId: null,
        items: [],
        version: 1,
        erstelltAm: '2026-04-22T00:00:00Z',
      },
    ];
    client.setQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen('e-1'), initialList);

    const { result } = renderHook(() => useCreateGefaehrdungsbeurteilung('e-1'), { wrapper });

    await expect(result.current.mutateAsync({ einheitId: 'einheit-1', vorlageId: 'v-1' })).rejects.toThrow('boom');

    const cached = client.getQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen('e-1'));
    expect(cached).toEqual(initialList);
  });
});

describe('useGefaehrdungsbeurteilung (Story 2.2 AC10)', () => {
  beforeEach(() => {
    mockGetBeurteilung.mockReset();
  });

  const detailResponse = {
    data: {
      id: 'b-7',
      einsatzId: 'e-1',
      einheitId: 'einheit-1',
      vorlageId: null,
      gefahrenzoneId: null,
      items: [{ title: 'Alt', eintritt: 'HAEUFIG', schaden: 'HOCH', risikoklasse: 'ORANGE' }],
      version: 1,
      erstelltAm: '2026-04-22T00:00:00Z',
      erstelltVonUserId: 'u-1',
      aktualisiertAm: '2026-04-22T00:00:00Z',
      aktualisiertVonUserId: 'u-1',
    },
    meta: {},
  };

  it('ist deaktiviert bei leerer einsatzId oder id', () => {
    const { wrapper } = makeWrapper();
    const { result: a } = renderHook(() => useGefaehrdungsbeurteilung('', 'b-7'), { wrapper });
    const { result: b } = renderHook(() => useGefaehrdungsbeurteilung('e-1', ''), { wrapper });
    expect(a.current.fetchStatus).toBe('idle');
    expect(b.current.fetchStatus).toBe('idle');
    expect(mockGetBeurteilung).not.toHaveBeenCalled();
  });

  it('lädt das Detail-DTO und reicht einsatzId + id an den generierten Client durch', async () => {
    mockGetBeurteilung.mockResolvedValueOnce(detailResponse);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilung('e-1', 'b-7'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('b-7');
    expect(result.current.data?.version).toBe(1);
    expect(mockGetBeurteilung).toHaveBeenCalledWith({ einsatzId: 'e-1', id: 'b-7' });
  });

  it('trägt meta.silentError (Zero-Toast-Policy)', async () => {
    mockGetBeurteilung.mockResolvedValueOnce(detailResponse);
    const { client, wrapper } = makeWrapper();
    renderHook(() => useGefaehrdungsbeurteilung('e-1', 'b-7'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7') });
      expect(cached?.meta?.silentError).toBe(true);
    });
  });
});

describe('useUpdateGefaehrdungsbeurteilungItems (Story 2.2 AC10)', () => {
  beforeEach(() => {
    mockUpdateItems.mockReset();
  });

  const existing = {
    id: 'b-7',
    einsatzId: 'e-1',
    einheitId: 'einheit-1',
    vorlageId: null,
    gefahrenzoneId: null,
    items: [{ title: 'Alt', eintritt: 'HAEUFIG', schaden: 'HOCH', risikoklasse: 'ORANGE' }],
    version: 1,
    erstelltAm: '2026-04-22T00:00:00Z',
    erstelltVonUserId: 'u-1',
    aktualisiertAm: '2026-04-22T00:00:00Z',
    aktualisiertVonUserId: 'u-1',
  };

  const updateResponse = {
    data: {
      ...existing,
      items: [{ title: 'Neu', eintritt: 'GELEGENTLICH', schaden: 'MITTEL', risikoklasse: 'GELB' }],
      version: 2,
      aktualisiertAm: '2026-04-22T01:00:00Z',
      aktualisiertVonUserId: 'u-2',
    },
    meta: {},
  };

  it('sendet items + expectedVersion an den Update-Endpoint und übernimmt die Response in den Cache', async () => {
    mockUpdateItems.mockResolvedValueOnce(updateResponse);
    const { client, wrapper } = makeWrapper();
    client.setQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7'), existing);

    const { result } = renderHook(() => useUpdateGefaehrdungsbeurteilungItems('e-1', 'b-7'), { wrapper });
    const payload = { items: [{ title: 'Neu', eintritt: 'GELEGENTLICH' as const, schaden: 'MITTEL' as const }], expectedVersion: 1 };
    const returned = await result.current.mutateAsync(payload);

    expect(returned.version).toBe(2);
    expect(mockUpdateItems).toHaveBeenCalledWith({
      einsatzId: 'e-1',
      id: 'b-7',
      updateGefaehrdungsbeurteilungItemsDto: {
        items: [{ id: undefined, title: 'Neu', description: undefined, eintritt: 'GELEGENTLICH', schaden: 'MITTEL', schutzmassnahmen: undefined }],
        expectedVersion: 1,
      },
    });

    await waitFor(() => {
      const cached = client.getQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7')) as typeof existing;
      expect(cached?.version).toBe(2);
    });
  });

  it('(Optimistic-Update) aktualisiert den Cache sofort mit expectedVersion+1 und rollt bei 409 zurück', async () => {
    mockUpdateItems.mockRejectedValueOnce({ response: { status: 409 } });
    const { client, wrapper } = makeWrapper();
    client.setQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7'), existing);

    const { result } = renderHook(() => useUpdateGefaehrdungsbeurteilungItems('e-1', 'b-7'), { wrapper });
    const payload = { items: [{ title: 'Neu', eintritt: 'HAEUFIG' as const, schaden: 'HOCH' as const }], expectedVersion: 1 };
    await expect(result.current.mutateAsync(payload)).rejects.toMatchObject({ response: { status: 409 } });

    await waitFor(() => {
      const cached = client.getQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7')) as typeof existing;
      // Nach dem Rollback ist der Cache wieder wie vorher.
      expect(cached).toEqual(existing);
    });
  });

  it('(Error-Propagation) 409 wird NICHT silent — die Mutation wirft den Error durch', async () => {
    mockUpdateItems.mockRejectedValueOnce({ response: { status: 409 } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateGefaehrdungsbeurteilungItems('e-1', 'b-7'), { wrapper });
    const payload = { items: [], expectedVersion: 1 };
    await expect(result.current.mutateAsync(payload)).rejects.toMatchObject({ response: { status: 409 } });
  });
});
