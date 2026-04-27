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
const mockListBeurteilungen = vi.fn();
const mockCreateBeurteilung = vi.fn();
const mockGetBeurteilung = vi.fn();
const mockUpdateItems = vi.fn();
const mockGetHistorie = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzHealthControllerGetHealthVAlpha: mockGetHealth,
      gefaehrdungsbeurteilungControllerListVorlagenVAlpha: mockListVorlagen,
      gefaehrdungsbeurteilungControllerListBeurteilungenVAlpha: mockListBeurteilungen,
      gefaehrdungsbeurteilungControllerCreateBeurteilungVAlpha: mockCreateBeurteilung,
      gefaehrdungsbeurteilungControllerGetBeurteilungVAlpha: mockGetBeurteilung,
      gefaehrdungsbeurteilungControllerUpdateItemsVAlpha: mockUpdateItems,
      gefaehrdungsbeurteilungControllerGetHistorieVAlpha: mockGetHistorie,
    }),
  },
}));

import {
  EIGENSCHUTZ_QUERY_KEYS,
  GefaehrdungsbeurteilungConflictError,
  extractConflictError,
  useCreateGefaehrdungsbeurteilung,
  useGefaehrdungsbeurteilung,
  useGefaehrdungsbeurteilungHistorie,
  useGefaehrdungsbeurteilungen,
  useGefaehrdungsbeurteilungVorlagen,
  useUpdateGefaehrdungsbeurteilungItems,
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

describe('EIGENSCHUTZ_QUERY_KEYS (Story 2.1 + 2.4)', () => {
  it('baut hierarchische Keys für Vorlagen-, Liste- und Detail-Caches', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungsVorlagen('e-1')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungs-vorlagen']);
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen('e-1')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungen']);
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungen', 'b-7']);
  });

  it('baut den Historie-Sub-Key unter dem Detail-Key an (Story 2.4 AC10)', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie('e-1', 'b-7')).toEqual(['eigenschutz', 'e-1', 'gefaehrdungsbeurteilungen', 'b-7', 'historie']);
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

    it('retriet NICHT bei 403 (Einsatz-Zugriff abgelehnt, Zero-Toast-Drawer übernimmt)', async () => {
      const retry = await readRetryFn();
      expect(retry(0, { response: { status: 403 } })).toBe(false);
      expect(retry(5, { response: { status: 403 } })).toBe(false);
    });
  });
});

describe('useGefaehrdungsbeurteilungen', () => {
  beforeEach(() => {
    mockListBeurteilungen.mockReset();
  });

  it('ist deaktiviert bei leerer einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungen(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListBeurteilungen).not.toHaveBeenCalled();
  });

  it('entpackt die `data`-Property des Wrapped-Response und leitet einsatzId durch', async () => {
    mockListBeurteilungen.mockResolvedValueOnce({
      data: [
        {
          id: 'b-1',
          einsatzId: 'e-42',
          einheitId: 'einheit-1',
          vorlageId: null,
          gefahrenzoneId: null,
          items: [],
          version: 1,
          erstelltAm: '2026-04-24T08:00:00Z',
          erstelltVonUserId: 'u-1',
          aktualisiertAm: '2026-04-24T09:00:00Z',
          aktualisiertVonUserId: 'u-1',
        },
      ],
      meta: {},
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungen('e-42'), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0]?.id).toBe('b-1');
    expect(mockListBeurteilungen).toHaveBeenCalledWith({ einsatzId: 'e-42' });
  });

  it('fallbackt auf leeres Array, wenn der Envelope unerwartet `data` nicht liefert', async () => {
    mockListBeurteilungen.mockResolvedValueOnce({ meta: {} } as unknown as { data: []; meta: object });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungen('e-7'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('trägt meta.silentError für inline Fehleranzeige auf der Page', async () => {
    mockListBeurteilungen.mockResolvedValueOnce({ data: [], meta: {} });
    const { client, wrapper } = makeWrapper();
    renderHook(() => useGefaehrdungsbeurteilungen('e-99'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen('e-99'),
      });
      expect(cached?.meta?.silentError).toBe(true);
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
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
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
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie('e-1', 'b-7'),
      });
    });
  });

  it('bereinigt null-Felder im Items-Mapping zu undefined für den generierten Client', async () => {
    mockUpdateItems.mockResolvedValueOnce(updateResponse);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateGefaehrdungsbeurteilungItems('e-1', 'b-7'), { wrapper });

    await result.current.mutateAsync({
      items: [{ id: null, title: 'Neu', description: null, eintritt: 'GELEGENTLICH', schaden: 'MITTEL', schutzmassnahmen: null } as never],
      expectedVersion: 1,
    });

    expect(mockUpdateItems).toHaveBeenCalledWith({
      einsatzId: 'e-1',
      id: 'b-7',
      updateGefaehrdungsbeurteilungItemsDto: {
        items: [{ id: undefined, title: 'Neu', description: undefined, eintritt: 'GELEGENTLICH', schaden: 'MITTEL', schutzmassnahmen: undefined }],
        expectedVersion: 1,
      },
    });
  });

  it('(Optimistic-Update) aktualisiert den Cache sofort mit expectedVersion+1 und rollt bei 409 zurück', async () => {
    mockUpdateItems.mockRejectedValueOnce({ response: { status: 409 } });
    const { client, wrapper } = makeWrapper();
    client.setQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7'), existing);

    const { result } = renderHook(() => useUpdateGefaehrdungsbeurteilungItems('e-1', 'b-7'), { wrapper });
    const payload = { items: [{ title: 'Neu', eintritt: 'HAEUFIG' as const, schaden: 'HOCH' as const }], expectedVersion: 1 };
    // Story 2.3 AC13: Der 409-Error wird auf `GefaehrdungsbeurteilungConflictError`
    // gemappt (typsiert, trägt `currentVersion` + `attemptedVersion`), statt den
    // rohen Fetch-Error weiterzureichen.
    await expect(result.current.mutateAsync(payload)).rejects.toBeInstanceOf(GefaehrdungsbeurteilungConflictError);

    await waitFor(() => {
      const cached = client.getQueryData(EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung('e-1', 'b-7')) as typeof existing;
      // Nach dem Rollback ist der Cache wieder wie vorher.
      expect(cached).toEqual(existing);
    });
  });

  it('(Error-Propagation) 409 wird NICHT silent — die Mutation wirft den typsierten ConflictError durch', async () => {
    mockUpdateItems.mockRejectedValueOnce({
      response: { status: 409, data: { context: { currentVersion: 5, attemptedVersion: 1 } } },
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateGefaehrdungsbeurteilungItems('e-1', 'b-7'), { wrapper });
    const payload = { items: [], expectedVersion: 1 };
    await expect(result.current.mutateAsync(payload)).rejects.toMatchObject({
      statusCode: 409,
      currentVersion: 5,
      attemptedVersion: 1,
    });
  });
});

describe('extractConflictError (Story 2.3 AC13)', () => {
  it('extrahiert currentVersion + attemptedVersion aus validem 409-Context', () => {
    const raw = {
      response: {
        status: 409,
        data: {
          statusCode: 409,
          error: 'Conflict',
          message: 'ConflictDetected:Gefaehrdungsbeurteilung',
          context: { currentVersion: 5, attemptedVersion: 3 },
        },
      },
    };
    const extracted = extractConflictError(raw, 3);

    expect(extracted).toBeInstanceOf(GefaehrdungsbeurteilungConflictError);
    expect(extracted?.currentVersion).toBe(5);
    expect(extracted?.attemptedVersion).toBe(3);
    expect(extracted?.statusCode).toBe(409);
    expect(extracted?.originalError).toBe(raw);
  });

  it('fallbackt auf undefined currentVersion, wenn der Context das Feld nicht hat (älteres Backend)', () => {
    const raw = {
      response: {
        status: 409,
        data: {
          statusCode: 409,
          error: 'Conflict',
          message: 'ConflictDetected:Gefaehrdungsbeurteilung',
          // `attemptedVersion` allein reicht nicht fürs Schema → safeParse schlägt fehl.
          context: { attemptedVersion: 3 },
        },
      },
    };
    const extracted = extractConflictError(raw, 3);

    expect(extracted).toBeInstanceOf(GefaehrdungsbeurteilungConflictError);
    expect(extracted?.currentVersion).toBeUndefined();
    // attemptedVersion kommt aus dem Input, nicht aus dem Context → bleibt erhalten.
    expect(extracted?.attemptedVersion).toBe(3);
  });

  it('fallbackt auf undefined currentVersion bei invaliden Typen (Zod-Guard non-throwing)', () => {
    const raw = {
      response: {
        status: 409,
        data: {
          context: { currentVersion: 'five', attemptedVersion: 3 },
        },
      },
    };
    const extracted = extractConflictError(raw, 3);

    expect(extracted).toBeInstanceOf(GefaehrdungsbeurteilungConflictError);
    expect(extracted?.currentVersion).toBeUndefined();
  });

  it('liefert null bei Nicht-409-Fehlern, damit der Hook den Original-Error weiterwirft', () => {
    const raw422 = { response: { status: 422, data: { message: 'ValidationFailed:title' } } };
    const raw500 = { response: { status: 500 } };
    const rawNetwork = new Error('network boom');

    expect(extractConflictError(raw422, 3)).toBeNull();
    expect(extractConflictError(raw500, 3)).toBeNull();
    expect(extractConflictError(rawNetwork, 3)).toBeNull();
    expect(extractConflictError(null, 3)).toBeNull();
  });
});

describe('useGefaehrdungsbeurteilungHistorie (Story 2.4 AC10)', () => {
  beforeEach(() => {
    mockGetHistorie.mockReset();
  });

  it('ist deaktiviert bei leerer einsatzId oder id', () => {
    const { wrapper } = makeWrapper();
    const hookA = renderHook(() => useGefaehrdungsbeurteilungHistorie('', 'b-7'), { wrapper });
    const hookB = renderHook(() => useGefaehrdungsbeurteilungHistorie('e-1', ''), { wrapper });

    expect(hookA.result.current.fetchStatus).toBe('idle');
    expect(hookB.result.current.fetchStatus).toBe('idle');
    expect(mockGetHistorie).not.toHaveBeenCalled();
  });

  it('entpackt die `data`-Property und leitet einsatzId + id durch', async () => {
    const payload = {
      aggregateVersion: 3,
      eintraege: [
        {
          version: 3,
          gueltigVon: '2026-04-23T12:00:00.000Z',
          gueltigBis: null,
          changedByUserId: 'u-1',
          changedByUserName: 'Erika Mustermann',
          changedFields: { added: ['i-9'], removed: [], updated: [], unchanged: 0 },
          items: [],
        },
        {
          version: 2,
          gueltigVon: '2026-04-23T11:00:00.000Z',
          gueltigBis: '2026-04-23T12:00:00.000Z',
          changedByUserId: 'u-1',
          changedByUserName: 'Erika Mustermann',
          changedFields: { added: [], removed: [], updated: [{ id: 'i-2', fields: ['eintritt'] }], unchanged: 1 },
          items: [],
        },
        { version: 1, gueltigVon: '2026-04-23T10:00:00.000Z', gueltigBis: '2026-04-23T11:00:00.000Z', changedByUserId: 'u-2', changedByUserName: null, changedFields: { created: true }, items: [] },
      ],
    };
    mockGetHistorie.mockResolvedValueOnce({ data: payload, meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefaehrdungsbeurteilungHistorie('e-42', 'b-7'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(payload);
    expect(mockGetHistorie).toHaveBeenCalledWith({ einsatzId: 'e-42', id: 'b-7' });
  });

  it('trägt meta.silentError + staleTime 5s + refetchOnMount=always + korrekten Historie-Query-Key', async () => {
    mockGetHistorie.mockResolvedValueOnce({ data: { aggregateVersion: 1, eintraege: [] }, meta: {} });
    const { client, wrapper } = makeWrapper();
    renderHook(() => useGefaehrdungsbeurteilungHistorie('e-99', 'b-7'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie('e-99', 'b-7') });
      expect(cached).toBeDefined();
    });
    const query = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie('e-99', 'b-7') });
    expect(query?.meta?.silentError).toBe(true);
    expect(query?.options.staleTime).toBe(5_000);
    expect(query?.options.refetchOnMount).toBe('always');
  });

  it('retriet NICHT bei 403 (Zero-Toast-Route übernimmt)', async () => {
    mockGetHistorie.mockResolvedValueOnce({ data: { aggregateVersion: 1, eintraege: [] }, meta: {} });
    const { client, wrapper } = makeWrapper();
    renderHook(() => useGefaehrdungsbeurteilungHistorie('e-1', 'b-7'), { wrapper });

    await waitFor(() => {
      const cached = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie('e-1', 'b-7') });
      expect(cached).toBeDefined();
    });
    const query = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie('e-1', 'b-7') });
    const retry = query?.options.retry;
    if (typeof retry !== 'function') {
      throw new Error('retry muss für diese Query eine Funktion sein');
    }
    expect(retry(0, { response: { status: 403 } })).toBe(false);
    expect(retry(0, { response: { status: 500 } })).toBe(true);
    expect(retry(2, { response: { status: 500 } })).toBe(false);
  });
});
