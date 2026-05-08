/**
 * Spec für `useReportVorfall` (Story 5.1, AC10).
 *
 * Schwerpunkte:
 * - Mutation ruft den generierten Client und entpackt `data` aus dem
 *   Wrapped-Response.
 * - Erfolg invalidiert den `vorfaelleByEinsatz`-Cache (Story 5.3 plug-and-play).
 * - 422 / 403 werden propagiert; UI-Komponente liest `mutation.error`
 *   (Zero-Toast UX-DR21).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReport = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzVorfallControllerReportVorfallVAlpha: mockReport,
    }),
  },
}));

import { useReportVorfall, vorfallQueryKeys } from '../use-report-vorfall';
import { EIGENSCHUTZ_QUERY_KEYS } from '../queries';

const VORFALL_DTO = {
  id: 'vorfall-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  vorfallZeit: '2026-05-06T10:00:00.000Z',
  wann: '2026-05-06T10:00:00.000Z',
  was: 'Sturz',
  wo: null,
  beteiligte: [],
  massnahmen: '',
  unfallkasseRelevant: true,
  erfasstAm: '2026-05-06T10:00:00.000Z',
  erfasstVonUserId: 'user-1',
  kontextSnapshot: {},
  gefBeurteilungVersionId: null,
};

const REPORT_BODY = {
  einheitId: 'einheit-1',
  was: 'Sturz',
  wann: '2026-05-06T10:00:00.000Z',
  vorfallZeit: '2026-05-06T10:00:00.000Z',
  wo: null,
  beteiligte: [],
  massnahmen: '',
  unfallkasseRelevant: true,
};

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => {
  mockReport.mockReset();
});

describe('vorfallQueryKeys', () => {
  it('liefert hierarchischen Cache-Key', () => {
    expect(vorfallQueryKeys.byEinsatz('einsatz-1')).toEqual(['eigenschutz-vorfaelle', 'einsatz-1']);
    expect(vorfallQueryKeys.all).toEqual(['eigenschutz-vorfaelle']);
  });
});

describe('useReportVorfall', () => {
  it('ruft den generierten Client und entpackt data', async () => {
    mockReport.mockResolvedValue({ data: VORFALL_DTO });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useReportVorfall('einsatz-1'), { wrapper });

    const promise = result.current.mutateAsync(REPORT_BODY);
    await expect(promise).resolves.toEqual(VORFALL_DTO);
    expect(mockReport).toHaveBeenCalledWith({ einsatzId: 'einsatz-1', reportVorfallDto: REPORT_BODY });
  });

  it('invalidiert Vorfall-Cache und Ampelstatus nach Erfolg', async () => {
    mockReport.mockResolvedValue({ data: VORFALL_DTO });
    const { client, wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useReportVorfall('einsatz-1'), { wrapper });

    await result.current.mutateAsync(REPORT_BODY);
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: vorfallQueryKeys.byEinsatz('einsatz-1') }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus('einsatz-1') });
  });

  it('propagiert 422-Fehler unverändert (Inline-Render im Drawer)', async () => {
    const error422 = { response: { status: 422, data: { context: { rule: 'ValidationFailed', field: 'wo' } } } };
    mockReport.mockRejectedValue(error422);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useReportVorfall('einsatz-1'), { wrapper });

    await expect(result.current.mutateAsync(REPORT_BODY)).rejects.toBe(error422);
  });

  it('propagiert 403-Fehler unverändert (Toast vom Caller)', async () => {
    const error403 = { response: { status: 403 } };
    mockReport.mockRejectedValue(error403);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useReportVorfall('einsatz-1'), { wrapper });

    await expect(result.current.mutateAsync(REPORT_BODY)).rejects.toBe(error403);
  });
});
