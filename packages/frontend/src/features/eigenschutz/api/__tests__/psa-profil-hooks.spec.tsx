import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockChangePsa = vi.fn();
const mockGetPsa = vi.fn();
const mockReportSyncConflict = vi.fn();
const mockListSyncConflicts = vi.fn();
const mockResolveSyncConflict = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      psaProfilControllerChangePsaProfilVAlpha: mockChangePsa,
      psaProfilControllerGetPsaProfileVAlpha: mockGetPsa,
      syncConflictControllerReportSyncConflictVAlpha: mockReportSyncConflict,
      syncConflictControllerListSyncConflictsVAlpha: mockListSyncConflicts,
      syncConflictControllerResolveSyncConflictVAlpha: mockResolveSyncConflict,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS, PsaProfilConflictError, useChangePsaProfil, usePsaProfileByEinheit, useResolveKonflikt, useSyncConflicts } from '../queries';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });

const EINSATZ_ID = 'einsatz-1';
const EINHEIT_ID = 'einheit-1';

describe('usePsaProfileByEinheit (Story 3.1 AC9)', () => {
  beforeEach(() => {
    mockGetPsa.mockReset();
  });

  it('lädt aktive Profile einer Einheit', async () => {
    const client = makeClient();
    mockGetPsa.mockResolvedValue({ data: [{ id: 'z1', profil: 'BASIS', version: 1 }] });

    const { result } = renderHook(() => usePsaProfileByEinheit(EINSATZ_ID, EINHEIT_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetPsa).toHaveBeenCalledWith({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID });
    expect(result.current.data).toHaveLength(1);
  });

  it('disabled wenn enabled=false', () => {
    const client = makeClient();
    renderHook(() => usePsaProfileByEinheit(EINSATZ_ID, EINHEIT_ID, { enabled: false }), { wrapper: wrapper(client) });
    expect(mockGetPsa).not.toHaveBeenCalled();
  });
});

describe('useChangePsaProfil (Story 3.1 AC1+AC9)', () => {
  beforeEach(() => {
    mockChangePsa.mockReset();
  });

  it('sendet Mutation an Toggle-Endpoint und invalidiert nur die einheit-spezifische Query', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockChangePsa.mockResolvedValue({ data: { propagationGroupId: 'group-1', affected: [] } });

    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: true }], begruendung: 'Routine' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockChangePsa).toHaveBeenCalledWith(expect.objectContaining({ einsatzId: EINSATZ_ID, einheitId: EINHEIT_ID, changePsaProfilDto: expect.objectContaining({ begruendung: 'Routine' }) }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(EINSATZ_ID, EINHEIT_ID) });
  });

  it('mappt 409 mit context.currentVersion auf PsaProfilConflictError (OCC)', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(Object.assign(new Error('409'), { response: { status: 409, data: { context: { currentVersion: 5 } } } }));
    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(PsaProfilConflictError);
    expect((result.current.error as PsaProfilConflictError).variant).toBe('OCC');
    expect((result.current.error as PsaProfilConflictError).currentVersion).toBe(5);
  });

  it('Story 3.9 AC1: extrahiert context.zuweisungId aus 409-Body in PsaProfilConflictError.zuweisungId', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(
      Object.assign(new Error('409'), {
        response: { status: 409, data: { context: { currentVersion: 5, zuweisungId: 'clw3h8x9y0000qwertyuiloser1' } } },
      }),
    );
    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as PsaProfilConflictError).zuweisungId).toBe('clw3h8x9y0000qwertyuiloser1');
  });

  it('Story 3.9 AC1: 409-Body ohne zuweisungId hält PsaProfilConflictError.zuweisungId === undefined (Backward-Compat)', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(Object.assign(new Error('409'), { response: { status: 409, data: { context: { currentVersion: 5 } } } }));
    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 1 }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as PsaProfilConflictError).zuweisungId).toBeUndefined();
  });

  it('mappt 409 mit context.rule=DuplicateActiveProfile auf PsaProfilConflictError (Duplicate-Variante)', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(Object.assign(new Error('409'), { response: { status: 409, data: { context: { rule: 'DuplicateActiveProfile' } } } }));
    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'INFEKTION', aktivieren: true }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as PsaProfilConflictError).variant).toBe('DuplicateActiveProfile');
  });

  it('reicht 422 unverändert weiter (kein Conflict-Wrap)', async () => {
    const client = makeClient();
    const raw = Object.assign(new Error('422'), { response: { status: 422, data: { context: { rule: 'ExpectedVersionRequired' } } } });
    mockChangePsa.mockRejectedValue(raw);
    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'INFEKTION', aktivieren: false }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(raw);
  });

  // P-26: meta.silentError-Konvention sichert, dass die globale Mutation-
  // Toast-Wrapper diesen Hook nicht mit einem generischen Sonner-Toast
  // begleitet (Zero-Toast-Pattern, UX-DR21). Der Drawer rendert Fehler inline.
  it('Mutation trägt meta.silentError=true (Zero-Toast)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });
    expect(result.current).toBeDefined();
    // Das `meta`-Field ist Teil der MutationOptions; wir greifen über die
    // QueryClient-Cache-Inspektion darauf zu, weil der Hook selbst es nicht
    // direkt exposed. Trigger erst eine Mutation, dann lies das `meta`.
    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: true }], begruendung: 'meta-check' });
    const cache = client.getMutationCache().getAll();
    expect(cache.length).toBeGreaterThan(0);
    expect(cache[0]?.meta).toEqual(expect.objectContaining({ silentError: true }));
  });

  it('Query usePsaProfileByEinheit trägt meta.silentError=true (Zero-Toast)', async () => {
    const client = makeClient();
    mockGetPsa.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => usePsaProfileByEinheit(EINSATZ_ID, EINHEIT_ID), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(EINSATZ_ID, EINHEIT_ID) });
    expect(query?.meta).toEqual(expect.objectContaining({ silentError: true }));
  });
});

describe('useChangePsaProfil — Story 3.9 AC7 Sync-Konflikt-Folgecall', () => {
  beforeEach(() => {
    mockChangePsa.mockReset();
    mockReportSyncConflict.mockReset();
  });

  it('409-Path mit context.zuweisungId triggert syncConflictControllerReportSyncConflictVAlpha genau einmal', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(
      Object.assign(new Error('409'), {
        response: { status: 409, data: { context: { currentVersion: 6, attemptedVersion: 5, einheitId: EINHEIT_ID, profil: 'BASIS', zuweisungId: 'clw3h8x9y0000qwertyuiloser1' } } },
      }),
    );
    mockReportSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-1', alreadyExisted: false } });

    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });
    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 5 }], begruendung: 'CBRN' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(mockReportSyncConflict).toHaveBeenCalledTimes(1));
    const callArgs = mockReportSyncConflict.mock.calls[0][0] as { einsatzId: string; reportSyncConflictDto: Record<string, unknown> };
    expect(callArgs.einsatzId).toBe(EINSATZ_ID);
    expect(callArgs.reportSyncConflictDto).toEqual(
      expect.objectContaining({
        einheitId: EINHEIT_ID,
        entityId: 'clw3h8x9y0000qwertyuiloser1',
        fieldPath: 'profil',
        serverVersion: 6,
        localExpectedVersion: 5,
      }),
    );
    // localPayload trägt das vollständige Hook-Input (Toggle-Set + Begründung).
    const lp = callArgs.reportSyncConflictDto.localPayload as Record<string, unknown>;
    expect(lp).toHaveProperty('toggles');
    expect(lp).toHaveProperty('begruendung', 'CBRN');
  });

  it('Backward-Compat: 409 ohne zuweisungId → reportSyncConflict NICHT aufgerufen, console.warn genau einmal', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const client = makeClient();
    mockChangePsa.mockRejectedValue(Object.assign(new Error('409'), { response: { status: 409, data: { context: { currentVersion: 6, attemptedVersion: 5 } } } }));

    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });
    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 5 }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockReportSyncConflict).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('zuweisungId'));
    warnSpy.mockRestore();
  });

  it('Promise-Chain: useChangePsaProfil wirft weiterhin den PsaProfilConflictError trotz Folgecall (Drawer-Banner-Pfad bleibt)', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(
      Object.assign(new Error('409'), {
        response: { status: 409, data: { context: { currentVersion: 6, attemptedVersion: 5, zuweisungId: 'clw3h8x9y0000qwertyuiloser1' } } },
      }),
    );
    mockReportSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-2', alreadyExisted: false } });

    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });
    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 5 }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(PsaProfilConflictError);
    expect((result.current.error as PsaProfilConflictError).zuweisungId).toBe('clw3h8x9y0000qwertyuiloser1');
  });

  it('Idempotenz-Echo: 202-Response mit alreadyExisted=true erzeugt keinen Frontend-Effekt (Banner kommt aus WS-Frame)', async () => {
    const client = makeClient();
    mockChangePsa.mockRejectedValue(
      Object.assign(new Error('409'), {
        response: { status: 409, data: { context: { currentVersion: 6, attemptedVersion: 5, zuweisungId: 'clw3h8x9y0000qwertyuiloser1' } } },
      }),
    );
    mockReportSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-existing', alreadyExisted: true } });

    const { result } = renderHook(() => useChangePsaProfil(EINSATZ_ID), { wrapper: wrapper(client) });
    result.current.mutate({ einheitId: EINHEIT_ID, profilToggles: [{ profil: 'BASIS', aktivieren: false, expectedVersion: 5 }], begruendung: 'X' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await waitFor(() => expect(mockReportSyncConflict).toHaveBeenCalledTimes(1));
    // Der Hook-Pfad selbst ist OBLIVIOUS zur 202-Response — `mutate(...)` ohne await.
    // Die Mutation propagiert NICHT als Hook-State zurück (kein .data o. ä.).
    expect(result.current.error).toBeInstanceOf(PsaProfilConflictError);
  });
});

describe('useSyncConflicts (Story 3.10 AC7)', () => {
  beforeEach(() => {
    mockListSyncConflicts.mockReset();
  });

  it('Happy-Path: lädt Liste offener Sync-Konflikte', async () => {
    const client = makeClient();
    mockListSyncConflicts.mockResolvedValue({
      data: [{ id: 'sc-1', einheitId: EINHEIT_ID, entityType: 'PSA_PROFIL_ZUWEISUNG', entityId: 'z1', fieldPath: 'profil' }],
    });

    const { result } = renderHook(() => useSyncConflicts(EINSATZ_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListSyncConflicts).toHaveBeenCalledWith({ einsatzId: EINSATZ_ID, entityType: undefined, einheitId: undefined });
    expect(result.current.data).toHaveLength(1);
  });

  it('Filter-Pass-Through: entityType + einheitId werden 1:1 an den Endpoint durchgereicht', async () => {
    const client = makeClient();
    mockListSyncConflicts.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useSyncConflicts(EINSATZ_ID, { entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: EINHEIT_ID }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListSyncConflicts).toHaveBeenCalledWith({ einsatzId: EINSATZ_ID, entityType: 'PSA_PROFIL_ZUWEISUNG', einheitId: EINHEIT_ID });
  });

  it('Filter-Cache-Separation: verschiedene Filter leben unter verschiedenen Query-Keys', async () => {
    const client = makeClient();
    mockListSyncConflicts.mockResolvedValue({ data: [] });

    const { result: rUnfiltered } = renderHook(() => useSyncConflicts(EINSATZ_ID), { wrapper: wrapper(client) });
    const { result: rFiltered } = renderHook(() => useSyncConflicts(EINSATZ_ID, { einheitId: EINHEIT_ID }), { wrapper: wrapper(client) });

    await waitFor(() => expect(rUnfiltered.current.isSuccess).toBe(true));
    await waitFor(() => expect(rFiltered.current.isSuccess).toBe(true));

    const queries = client.getQueryCache().getAll();
    const syncConflictKeys = queries.map((q) => q.queryKey).filter((k) => Array.isArray(k) && k[2] === 'sync-conflicts');
    expect(syncConflictKeys.length).toBeGreaterThanOrEqual(2);
  });

  it('403 → kein Retry, silentError im meta gesetzt (Zero-Toast UX-DR21)', async () => {
    const client = makeClient();
    const err = Object.assign(new Error('forbidden'), { response: { status: 403 } });
    mockListSyncConflicts.mockRejectedValue(err);

    const { result } = renderHook(() => useSyncConflicts(EINSATZ_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Genau ein Aufruf — kein Retry bei 403.
    expect(mockListSyncConflicts).toHaveBeenCalledTimes(1);
    const query = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.syncConflicts(EINSATZ_ID) });
    expect(query?.meta).toEqual(expect.objectContaining({ silentError: true }));
  });

  it('disabled wenn einsatzId leer ist', () => {
    const client = makeClient();
    renderHook(() => useSyncConflicts(''), { wrapper: wrapper(client) });
    expect(mockListSyncConflicts).not.toHaveBeenCalled();
  });
});

describe('useResolveKonflikt (Story 3.10 AC7)', () => {
  beforeEach(() => {
    mockResolveSyncConflict.mockReset();
  });

  it('Happy-Path SERVER_WINS: ruft Endpoint mit Resolution-DTO auf', async () => {
    const client = makeClient();
    mockResolveSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-1', alreadyResolved: false, resolvedAt: new Date('2026-05-04T10:00:00.000Z') } });

    const { result } = renderHook(() => useResolveKonflikt(EINSATZ_ID), { wrapper: wrapper(client) });
    result.current.mutate({ syncConflictId: 'sc-1', resolution: 'SERVER_WINS' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockResolveSyncConflict).toHaveBeenCalledWith({
      einsatzId: EINSATZ_ID,
      syncConflictId: 'sc-1',
      resolveSyncConflictDto: { resolution: 'SERVER_WINS' },
    });
    expect(result.current.data?.syncConflictId).toBe('sc-1');
  });

  it('onSuccess SERVER_WINS: invalidiert sync-conflicts UND psa-profile (Story 3.10 F3)', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockResolveSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-1', alreadyResolved: false, resolvedAt: new Date() } });

    const { result } = renderHook(() => useResolveKonflikt(EINSATZ_ID), { wrapper: wrapper(client) });
    invalidateSpy.mockClear();
    result.current.mutate({ syncConflictId: 'sc-1', resolution: 'SERVER_WINS' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    // F3: Auch SERVER_WINS invalidiert psa-profile, weil der Server-State
    // sich beim Konflikt-Resolve verschoben haben kann und der WS-Frame
    // nicht garantiert zuerst eintrifft.
    expect(keys).toEqual(
      expect.arrayContaining([
        ['eigenschutz', EINSATZ_ID, 'sync-conflicts'],
        ['eigenschutz', EINSATZ_ID, 'psa-profile'],
      ]),
    );
  });

  it('onSuccess LOCAL_WINS: invalidiert sync-conflicts UND psa-profile', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockResolveSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-2', alreadyResolved: false, resolvedAt: new Date() } });

    const { result } = renderHook(() => useResolveKonflikt(EINSATZ_ID), { wrapper: wrapper(client) });
    invalidateSpy.mockClear();
    result.current.mutate({ syncConflictId: 'sc-2', resolution: 'LOCAL_WINS' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        ['eigenschutz', EINSATZ_ID, 'sync-conflicts'],
        ['eigenschutz', EINSATZ_ID, 'psa-profile'],
      ]),
    );
  });

  it('onSuccess MERGED: invalidiert sync-conflicts UND psa-profile (Story 3.10 F3)', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockResolveSyncConflict.mockResolvedValue({ data: { syncConflictId: 'sc-merged', alreadyResolved: false, resolvedAt: new Date() } });

    const { result } = renderHook(() => useResolveKonflikt(EINSATZ_ID), { wrapper: wrapper(client) });
    invalidateSpy.mockClear();
    result.current.mutate({ syncConflictId: 'sc-merged', resolution: 'MERGED' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    // F3: MERGED vereint Toggle-Sets (Phase 2), Server-State ändert sich —
    // psa-profile muss invalidiert werden.
    expect(keys).toEqual(
      expect.arrayContaining([
        ['eigenschutz', EINSATZ_ID, 'sync-conflicts'],
        ['eigenschutz', EINSATZ_ID, 'psa-profile'],
      ]),
    );
  });

  it('Error-Path: Server-Sentinel propagiert unverändert (Zero-Toast: meta.silentError)', async () => {
    const client = makeClient();
    const err = Object.assign(new Error('409'), {
      response: { status: 409, data: { context: { rule: 'ConflictAlreadyResolved' } } },
    });
    mockResolveSyncConflict.mockRejectedValue(err);

    const { result } = renderHook(() => useResolveKonflikt(EINSATZ_ID), { wrapper: wrapper(client) });
    result.current.mutate({ syncConflictId: 'sc-3', resolution: 'SERVER_WINS' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(err);
    const cache = client.getMutationCache().getAll();
    expect(cache.length).toBeGreaterThan(0);
    expect(cache[cache.length - 1]?.meta).toEqual(expect.objectContaining({ silentError: true }));
  });
});
