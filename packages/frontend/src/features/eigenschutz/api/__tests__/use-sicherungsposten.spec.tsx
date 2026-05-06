/**
 * Spec für die Sicherungsposten-Hooks (Story 4.1, T6).
 *
 * Schwerpunkte:
 * - List-Hook ruft den generierten Client mit Status-Filter auf und entpackt
 *   `data` aus dem Wrapped-Response.
 * - Create-Hook invalidiert nach Erfolg den Sicherungsposten-Prefix.
 * - 409-Antworten werden auf einen typsierten
 *   `SicherungspostenConflictError` gemappt (UX-DR21, kein Toast).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockAufloesen = vi.fn();
const mockGet = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      sicherungspostenControllerListSicherungspostenVAlpha: mockList,
      sicherungspostenControllerCreateSicherungspostenVAlpha: mockCreate,
      sicherungspostenControllerUpdateSicherungspostenVAlpha: mockUpdate,
      sicherungspostenControllerAufloeseSicherungspostenVAlpha: mockAufloesen,
      sicherungspostenControllerGetSicherungspostenVAlpha: mockGet,
    }),
  },
}));

import {
  SicherungspostenConflictError,
  sicherungspostenQueryKeys,
  useAufloeseSicherungsposten,
  useCreateSicherungsposten,
  useGetSicherungsposten,
  useListSicherungsposten,
  useUpdateSicherungsposten,
} from '../use-sicherungsposten';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const POSTEN_DTO = {
  id: 'posten-1',
  einsatzId: 'einsatz-1',
  bezeichnung: 'Eingang Hörsaal C',
  standort: { kind: 'address', text: 'Hörsaal C' },
  personal: [],
  version: 3,
  erstelltAm: '2026-05-01T10:00:00.000Z',
  erstelltVonUserId: 'user-1',
  aktualisiertAm: '2026-05-01T10:00:00.000Z',
  aktualisiertVonUserId: 'user-1',
};

beforeEach(() => {
  mockList.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockAufloesen.mockReset();
  mockGet.mockReset();
});

describe('sicherungspostenQueryKeys', () => {
  it('liefert hierarchischen Status-Key', () => {
    expect(sicherungspostenQueryKeys.list('einsatz-1', 'AKTIV')).toEqual(['sicherungsposten', 'einsatz-1', 'AKTIV']);
    expect(sicherungspostenQueryKeys.all).toEqual(['sicherungsposten']);
  });

  it('liefert byId-Key mit Detail-Discriminator (Story 4.4 AC2)', () => {
    expect(sicherungspostenQueryKeys.byId('einsatz-1', 'posten-1')).toEqual(['sicherungsposten', 'einsatz-1', 'detail', 'posten-1']);
  });
});

describe('useGetSicherungsposten (Story 4.4)', () => {
  it('lädt einen Posten erfolgreich und entpackt data aus dem Wrapped-Response', async () => {
    mockGet.mockResolvedValueOnce({ data: POSTEN_DTO, meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetSicherungsposten('einsatz-1', 'posten-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(POSTEN_DTO));
    expect(mockGet).toHaveBeenCalledWith({ einsatzId: 'einsatz-1', postenId: 'posten-1' });
  });

  it('ist deaktiviert bei leerer postenId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetSicherungsposten('einsatz-1', ''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('ist deaktiviert bei leerer einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetSicherungsposten('', 'posten-1'), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe('byId-Cache-Invalidierung (Story 4.4 AC2)', () => {
  it('Update-Mutation invalidiert byEinsatz und byId nach Erfolg', async () => {
    mockUpdate.mockResolvedValueOnce({ data: { ...POSTEN_DTO, version: 4 }, meta: {} });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateSicherungsposten('einsatz-1'), { wrapper });

    await result.current.mutateAsync({
      postenId: POSTEN_DTO.id,
      body: { expectedVersion: 3, bezeichnung: 'Neu' },
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byEinsatz('einsatz-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byId('einsatz-1', POSTEN_DTO.id) });
    });

    // Reihenfolge: byEinsatz vor byId.
    const calls = invalidateSpy.mock.calls.map((c) => c[0]);
    const idxByEinsatz = calls.findIndex(
      (arg) =>
        Array.isArray((arg as { queryKey?: unknown[] }).queryKey) && JSON.stringify((arg as { queryKey: unknown[] }).queryKey) === JSON.stringify(sicherungspostenQueryKeys.byEinsatz('einsatz-1')),
    );
    const idxById = calls.findIndex(
      (arg) =>
        Array.isArray((arg as { queryKey?: unknown[] }).queryKey) &&
        JSON.stringify((arg as { queryKey: unknown[] }).queryKey) === JSON.stringify(sicherungspostenQueryKeys.byId('einsatz-1', POSTEN_DTO.id)),
    );
    expect(idxByEinsatz).toBeGreaterThanOrEqual(0);
    expect(idxById).toBeGreaterThan(idxByEinsatz);
  });

  it('Create-Mutation invalidiert byEinsatz und byId nach Erfolg (AC2)', async () => {
    mockCreate.mockResolvedValueOnce({ data: POSTEN_DTO, meta: {} });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateSicherungsposten('einsatz-1'), { wrapper });

    await result.current.mutateAsync({ bezeichnung: 'Posten Neu', standort: { kind: 'address', text: 'Eingang' }, personal: [] });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byEinsatz('einsatz-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byId('einsatz-1', POSTEN_DTO.id) });
    });
  });

  it('Aufloese-Mutation invalidiert byEinsatz und byId nach Erfolg (AC2)', async () => {
    mockAufloesen.mockResolvedValueOnce({ data: { ...POSTEN_DTO, aufgeloestAm: '2026-05-06T08:00:00.000Z' }, meta: {} });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useAufloeseSicherungsposten('einsatz-1'), { wrapper });

    await result.current.mutateAsync({
      postenId: POSTEN_DTO.id,
      body: { expectedVersion: 3, begruendung: 'Posten nicht mehr nötig' },
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byEinsatz('einsatz-1') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byId('einsatz-1', POSTEN_DTO.id) });
    });
  });
});

describe('useListSicherungsposten', () => {
  it('ist deaktiviert bei leerer einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useListSicherungsposten('', 'AKTIV'), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockList).not.toHaveBeenCalled();
  });

  it('ruft den generierten Client mit Status-Filter und entpackt data', async () => {
    mockList.mockResolvedValueOnce({ data: [POSTEN_DTO], meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useListSicherungsposten('einsatz-1', 'AKTIV'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([POSTEN_DTO]));
    expect(mockList).toHaveBeenCalledWith({ einsatzId: 'einsatz-1', status: 'AKTIV' });
  });

  it('liefert leeres Array bei non-Array-Payload (Defensive)', async () => {
    mockList.mockResolvedValueOnce({ data: null, meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useListSicherungsposten('einsatz-1', 'AUFGELOEST'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });
});

describe('useCreateSicherungsposten', () => {
  it('invalidiert nach Erfolg nur die Listen des betroffenen Einsatzes', async () => {
    mockCreate.mockResolvedValueOnce({ data: POSTEN_DTO, meta: {} });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateSicherungsposten('einsatz-1'), { wrapper });

    await result.current.mutateAsync({
      bezeichnung: 'Posten A',
      standort: { kind: 'address', text: 'Eingang' },
      personal: [],
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.byEinsatz('einsatz-1') });
    });
    // Defense gegen Cross-Einsatz-Cache-Nuke: NIEMALS den globalen `all`-Prefix invalidieren.
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: sicherungspostenQueryKeys.all });
    expect(mockCreate).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      createSicherungspostenDto: expect.objectContaining({ bezeichnung: 'Posten A' }),
    });
  });
});

describe('useUpdateSicherungsposten', () => {
  it('mappt 409 auf SicherungspostenConflictError mit currentVersion', async () => {
    const conflictResponse = { status: 409, data: { context: { currentVersion: 7 } } };
    mockUpdate.mockRejectedValueOnce({ response: conflictResponse });

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSicherungsposten('einsatz-1'), { wrapper });

    await expect(
      result.current.mutateAsync({
        postenId: 'posten-1',
        body: { expectedVersion: 3, bezeichnung: 'Neu' },
      }),
    ).rejects.toMatchObject({
      name: 'SicherungspostenConflictError',
      currentVersion: 7,
      attemptedVersion: 3,
    });
  });

  it('propagiert Nicht-409-Fehler unverändert', async () => {
    const error = { response: { status: 500, data: {} } };
    mockUpdate.mockRejectedValueOnce(error);

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useUpdateSicherungsposten('einsatz-1'), { wrapper });

    await expect(
      result.current.mutateAsync({
        postenId: 'posten-1',
        body: { expectedVersion: 3 },
      }),
    ).rejects.toBe(error);
  });

  it('SicherungspostenConflictError instanceof check', () => {
    const err = new SicherungspostenConflictError(7, 3, undefined);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(409);
    expect(err.name).toBe('SicherungspostenConflictError');
  });
});
