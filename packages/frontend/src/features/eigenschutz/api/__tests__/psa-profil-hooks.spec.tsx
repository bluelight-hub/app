import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockChangePsa = vi.fn();
const mockGetPsa = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      psaProfilControllerChangePsaProfilVAlpha: mockChangePsa,
      psaProfilControllerGetPsaProfileVAlpha: mockGetPsa,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS, PsaProfilConflictError, useChangePsaProfil, usePsaProfileByEinheit } from '../queries';

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
