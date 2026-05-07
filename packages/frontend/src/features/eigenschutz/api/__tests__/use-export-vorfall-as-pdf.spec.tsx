/**
 * Spec für `useExportVorfallAlsPdf` (Story 5.4, AC9).
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

import { buildVorfallPdfFilename, useExportVorfallAlsPdf } from '../use-export-vorfall-as-pdf';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useExportVorfallAlsPdf (Story 5.4)', () => {
  beforeEach(() => {
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockReset();
    downloadExportMock.mockClear();
  });

  it('(1) ruft generierten Client mit format="pdf" auf', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockResolvedValue({
      raw: { blob: vi.fn().mockResolvedValue(blob) },
    });

    const client = makeClient();
    const { result } = renderHook(() => useExportVorfallAlsPdf(), { wrapper: wrapper(client) });
    await act(async () => {
      await result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'v1' });
    });

    expect(eigenschutzVorfallControllerExportVorfallVAlphaRaw).toHaveBeenCalledWith({
      einsatzId: 'e1',
      vorfallId: 'v1',
      format: 'pdf',
    });
  });

  it('(2) triggert downloadExport mit Filename-Schema vorfall-<id>-YYYYMMDD-HHmm.pdf', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockResolvedValue({
      raw: { blob: vi.fn().mockResolvedValue(blob) },
    });

    const client = makeClient();
    const { result } = renderHook(() => useExportVorfallAlsPdf(), { wrapper: wrapper(client) });
    const out = await act(async () => result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'vorfall-42' }));

    expect(downloadExportMock).toHaveBeenCalledTimes(1);
    expect(downloadExportMock).toHaveBeenCalledWith(blob, expect.stringMatching(/^vorfall-vorfall-42-\d{8}-\d{4}\.pdf$/));
    expect(out.byteLength).toBe(blob.size);
    expect(out.filename).toMatch(/^vorfall-vorfall-42-\d{8}-\d{4}\.pdf$/);
  });

  it('(3) Error-Pfad: Mutation surface-t Error, kein Download', async () => {
    eigenschutzVorfallControllerExportVorfallVAlphaRaw.mockRejectedValue(new Error('boom'));

    const client = makeClient();
    const { result } = renderHook(() => useExportVorfallAlsPdf(), { wrapper: wrapper(client) });
    await act(async () => {
      await expect(result.current.mutateAsync({ einsatzId: 'e1', vorfallId: 'v1' })).rejects.toThrow('boom');
    });
    expect(downloadExportMock).not.toHaveBeenCalled();
  });

  it('(4) buildVorfallPdfFilename ist deterministisch bei fixem Datum', () => {
    const now = new Date('2026-05-07T08:30:00.000Z');
    const filename = buildVorfallPdfFilename('abc', now);
    expect(filename).toMatch(/^vorfall-abc-\d{8}-\d{4}\.pdf$/);
    // Deterministisch: zwei Aufrufe mit gleichem Datum liefern identischen Wert.
    expect(buildVorfallPdfFilename('abc', now)).toBe(filename);
  });
});
