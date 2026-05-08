/**
 * Spec für `useExportVorfallAlsJson` (Story 5.5, AC8).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const eigenschutzVorfallControllerExportVorfallVAlphaRaw = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzVorfallControllerExportVorfallVAlphaRaw,
    }),
  },
}));

const downloadExportMock = vi.fn(async () => undefined);
vi.mock('../../lib/download-export', () => ({
  downloadExport: (...args: unknown[]) => downloadExportMock(...args),
}));

import { buildVorfallJsonFilename, useExportVorfallAlsJson } from '../use-export-vorfall-as-json';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useExportVorfallAlsJson (Story 5.5)', () => {
  beforeEach(() => {
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockReset();
    downloadExportMock.mockReset();
    downloadExportMock.mockResolvedValue(undefined);
  });

  it('(1) ruft generierten Client mit format="json" auf — vor Story 5.5 hätte das ein 400 zurückgeliefert', async () => {
    const blob = new Blob(['{"schemaVersion":1}'], { type: 'application/json' });
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockResolvedValue({
      raw: { blob: vi.fn().mockResolvedValue(blob) },
    });

    const client = makeClient();
    const { result } = renderHook(() => useExportVorfallAlsJson(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'v1' });
    });

    expect(eigenschutzVorfallControllerExportVorfallVAlphaRaw).toHaveBeenCalledWith({
      einsatzId: 'e1',
      vorfallId: 'v1',
      format: 'json',
    });
  });

  it('(2) triggert downloadExport mit Filename-Schema vorfall-<id>-YYYYMMDD-HHmm.json', async () => {
    const blob = new Blob(['{"schemaVersion":1}'], { type: 'application/json' });
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockResolvedValue({
      raw: { blob: vi.fn().mockResolvedValue(blob) },
    });

    const client = makeClient();
    const { result } = renderHook(() => useExportVorfallAlsJson(), { wrapper: wrapper(client) });
    const out = await act(async () => result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'vorfall-42' }));

    expect(downloadExportMock).toHaveBeenCalledTimes(1);
    expect(downloadExportMock).toHaveBeenCalledWith(blob, expect.stringMatching(/^vorfall-vorfall-42-\d{8}-\d{4}\.json$/));
    expect(out.byteLength).toBe(blob.size);
    expect(out.filename).toMatch(/^vorfall-vorfall-42-\d{8}-\d{4}\.json$/);
  });

  it('(3) Error-Pfad: Mutation surface-t Error, kein Download und keine Audit-Invalidierung', async () => {
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockRejectedValue(new Error('boom'));

    const client = makeClient();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useExportVorfallAlsJson(), { wrapper: wrapper(client) });
    await act(async () => {
      await expect(result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'v1' })).rejects.toThrow('boom');
    });
    expect(downloadExportMock).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('(4) invalidiert Audit-Timeline auch wenn lokaler Download fehlschlägt', async () => {
    const blob = new Blob(['{"schemaVersion":1}'], { type: 'application/json' });
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockResolvedValue({
      raw: { blob: vi.fn().mockResolvedValue(blob) },
    });
    downloadExportMock.mockRejectedValue(new Error('download failed'));

    const client = makeClient();
    const invalidateQueries = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useExportVorfallAlsJson(), { wrapper: wrapper(client) });

    await act(async () => {
      await expect(result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'v1' })).rejects.toThrow('download failed');
    });

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['eigenschutz-vorfaelle', 'e1', 'detail', 'v1', 'auditTimeline'],
    });
  });

  it('(5) buildVorfallJsonFilename ist deterministisch bei fixem Datum', () => {
    const now = new Date('2026-05-07T10:30:00.000Z');
    const filename = buildVorfallJsonFilename('clw3h8x9y0000qwertyui05010', now);
    expect(filename).toMatch(/^vorfall-clw3h8x9y0000qwertyui05010-\d{8}-\d{4}\.json$/);
    expect(buildVorfallJsonFilename('clw3h8x9y0000qwertyui05010', now)).toBe(filename);
  });

  it('(6) Sanitization-Smoke: Pfad-Trenner werden zu _ ersetzt', () => {
    const filename = buildVorfallJsonFilename('../../etc/passwd', new Date('2026-05-07T10:30:00.000Z'));
    expect(filename).toMatch(/^vorfall-______etc_passwd-\d{8}-\d{4}\.json$/);
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('..');
  });
});
