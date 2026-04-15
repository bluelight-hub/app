/**
 * Unit Tests für Funkverkehr Mutation-Hooks.
 *
 * Prüft erfolgreiche Dispatches + optimistische Reorder-Projektion.
 */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const funkkanalControllerCreateVAlpha = vi.fn();
const funkkanalControllerUpdateVAlpha = vi.fn();
const funkkanalControllerArchiveVAlpha = vi.fn();
const funkkanalControllerReorderVAlpha = vi.fn();
const funkkanalZuordnungControllerCreateVAlpha = vi.fn();
const funkkanalZuordnungControllerUpdateRolleVAlpha = vi.fn();
const funkkanalZuordnungControllerRemoveVAlpha = vi.fn();
const kanalplanExportControllerExportPdfVAlphaRaw = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    funkkanal: () => ({
      funkkanalControllerCreateVAlpha,
      funkkanalControllerUpdateVAlpha,
      funkkanalControllerArchiveVAlpha,
      funkkanalControllerReorderVAlpha,
      funkkanalZuordnungControllerCreateVAlpha,
      funkkanalZuordnungControllerUpdateRolleVAlpha,
      funkkanalZuordnungControllerRemoveVAlpha,
      kanalplanExportControllerExportPdfVAlphaRaw,
    }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'error-message'),
}));

const downloadExportMock = vi.fn(async () => undefined);
vi.mock('@/features/reminders/lib/download-export', () => ({
  downloadExport: (...args: unknown[]) => downloadExportMock(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import {
  useArchiveFunkkanal,
  useCreateFunkkanal,
  useCreateZuordnung,
  useExportKanalplanPdf,
  useRemoveZuordnung,
  useReorderFunkkanaele,
  useUpdateFunkkanal,
  useUpdateZuordnungRolle,
} from '../mutations';
import { FUNKVERKEHR_QUERY_KEYS } from '../queries';

const wrapper = (client: QueryClient) => {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

describe('useCreateFunkkanal', () => {
  beforeEach(() => funkkanalControllerCreateVAlpha.mockReset());

  it('ruft API mit DTO auf und invalidiert den Kanalplan', async () => {
    funkkanalControllerCreateVAlpha.mockResolvedValue({ data: { id: 'k1' } });
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateFunkkanal('e1'), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Führung 1',
        details: { type: 'tmo', sprechgruppe: 'SG1' },
      });
    });

    expect(funkkanalControllerCreateVAlpha).toHaveBeenCalledWith({
      einsatzId: 'e1',
      createFunkkanalDto: { name: 'Führung 1', details: { type: 'tmo', sprechgruppe: 'SG1' } },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan('e1') });
  });
});

describe('useUpdateFunkkanal', () => {
  beforeEach(() => funkkanalControllerUpdateVAlpha.mockReset());

  it('patcht einen bestehenden Kanal', async () => {
    funkkanalControllerUpdateVAlpha.mockResolvedValue({ data: { id: 'k1' } });
    const client = makeClient();
    const { result } = renderHook(() => useUpdateFunkkanal('e1'), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ kanalId: 'k1', dto: { name: 'Neu' } });
    });

    expect(funkkanalControllerUpdateVAlpha).toHaveBeenCalledWith({
      einsatzId: 'e1',
      kanalId: 'k1',
      updateFunkkanalDto: { name: 'Neu' },
    });
  });
});

describe('useArchiveFunkkanal', () => {
  beforeEach(() => funkkanalControllerArchiveVAlpha.mockReset());

  it('ruft DELETE für den Kanal auf', async () => {
    funkkanalControllerArchiveVAlpha.mockResolvedValue(undefined);
    const client = makeClient();
    const { result } = renderHook(() => useArchiveFunkkanal('e1'), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ kanalId: 'k1' });
    });

    expect(funkkanalControllerArchiveVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1', kanalId: 'k1' });
  });
});

describe('useReorderFunkkanaele', () => {
  beforeEach(() => funkkanalControllerReorderVAlpha.mockReset());

  it('appliziert optimistische SortIndex-Updates im Cache', async () => {
    funkkanalControllerReorderVAlpha.mockImplementation(async () => new Promise((resolve) => setTimeout(() => resolve({ data: [] }), 50)));

    const client = makeClient();
    const queryKey = FUNKVERKEHR_QUERY_KEYS.kanalplan('e1');
    client.setQueryData(queryKey, {
      data: [
        { id: 'k1', sortIndex: 0, name: 'A' },
        { id: 'k2', sortIndex: 1, name: 'B' },
      ],
      meta: { requestId: 'r', timestamp: 'now' },
    });

    const { result } = renderHook(() => useReorderFunkkanaele('e1'), { wrapper: wrapper(client) });

    const mutationPromise = result.current.mutateAsync({
      ordering: [
        { id: 'k1', sortIndex: 1 },
        { id: 'k2', sortIndex: 0 },
      ],
    });

    await waitFor(() => {
      const cached = client.getQueryData<{ data: Array<{ id: string; sortIndex: number }> }>(queryKey);
      expect(cached?.data.map((k) => k.id)).toEqual(['k2', 'k1']);
    });

    await mutationPromise;
    expect(funkkanalControllerReorderVAlpha).toHaveBeenCalled();
  });
});

describe('Zuordnungs-Hooks', () => {
  beforeEach(() => {
    funkkanalZuordnungControllerCreateVAlpha.mockReset();
    funkkanalZuordnungControllerUpdateRolleVAlpha.mockReset();
    funkkanalZuordnungControllerRemoveVAlpha.mockReset();
  });

  it('useCreateZuordnung dispatcht mit kanalId + DTO', async () => {
    funkkanalZuordnungControllerCreateVAlpha.mockResolvedValue({ data: { id: 'k1' } });
    const client = makeClient();
    const { result } = renderHook(() => useCreateZuordnung('e1'), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ kanalId: 'k1', dto: { fahrzeugId: 'f1', rolle: 'primaer' } });
    });

    expect(funkkanalZuordnungControllerCreateVAlpha).toHaveBeenCalledWith({
      einsatzId: 'e1',
      kanalId: 'k1',
      createZuordnungDto: { fahrzeugId: 'f1', rolle: 'primaer' },
    });
  });

  it('useUpdateZuordnungRolle dispatcht mit Zuordnungs-ID', async () => {
    funkkanalZuordnungControllerUpdateRolleVAlpha.mockResolvedValue({ data: { id: 'k1' } });
    const client = makeClient();
    const { result } = renderHook(() => useUpdateZuordnungRolle('e1'), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ kanalId: 'k1', zuordnungId: 'z1', dto: { rolle: 'sekundaer' } });
    });

    expect(funkkanalZuordnungControllerUpdateRolleVAlpha).toHaveBeenCalledWith({
      einsatzId: 'e1',
      kanalId: 'k1',
      zuordnungId: 'z1',
      updateZuordnungRolleDto: { rolle: 'sekundaer' },
    });
  });

  it('useRemoveZuordnung dispatcht DELETE', async () => {
    funkkanalZuordnungControllerRemoveVAlpha.mockResolvedValue(undefined);
    const client = makeClient();
    const { result } = renderHook(() => useRemoveZuordnung('e1'), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ kanalId: 'k1', zuordnungId: 'z1' });
    });

    expect(funkkanalZuordnungControllerRemoveVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1', kanalId: 'k1', zuordnungId: 'z1' });
  });
});

describe('useExportKanalplanPdf', () => {
  beforeEach(() => {
    kanalplanExportControllerExportPdfVAlphaRaw.mockReset();
    downloadExportMock.mockClear();
  });

  it('liest Blob aus Raw-Response und triggert Download', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    kanalplanExportControllerExportPdfVAlphaRaw.mockResolvedValue({
      raw: { blob: vi.fn().mockResolvedValue(blob) },
    });

    const client = makeClient();
    const { result } = renderHook(() => useExportKanalplanPdf('e1'), { wrapper: wrapper(client) });

    const out = await act(async () => result.current.mutateAsync());
    expect(kanalplanExportControllerExportPdfVAlphaRaw).toHaveBeenCalledWith({ einsatzId: 'e1' });
    expect(downloadExportMock).toHaveBeenCalledWith(blob, expect.stringMatching(/^kanalplan-e1-\d{4}-\d{2}-\d{2}\.pdf$/));
    expect(out.blob).toBe(blob);
  });
});
