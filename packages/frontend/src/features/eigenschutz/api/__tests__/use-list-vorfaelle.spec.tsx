import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockList = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzVorfallControllerListVorfaelleVAlpha: mockList,
    }),
  },
}));

import { stableFilterHash, useListVorfaelle, vorfallListQueryKey } from '../use-list-vorfaelle';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const ROW = {
  id: 'vorfall-1',
  einheitId: 'einheit-1',
  vorfallZeit: '2026-05-06T10:00:00.000Z',
  was: 'Sturz',
  unfallkasseRelevant: true,
  erfasstAm: '2026-05-06T10:00:00.000Z',
  erfasstVonUserId: 'user-1',
};

beforeEach(() => {
  mockList.mockReset();
});

describe('useListVorfaelle (Story 5.3 AC7)', () => {
  it('(U1) lädt Liste via generierten Client und entpackt data; mappt einheitIds zu CSV', async () => {
    mockList.mockResolvedValueOnce({ data: [ROW], meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useListVorfaelle('einsatz-1', { einheitIds: ['einheit-1', 'einheit-2'], unfallkasseRelevant: true }), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([ROW]));
    expect(mockList).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      einheitIds: 'einheit-1,einheit-2',
      vorfallZeitVon: undefined,
      vorfallZeitBis: undefined,
      unfallkasseRelevant: true,
    });
  });

  it('(U2) ist deaktiviert ohne einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useListVorfaelle(undefined, {}), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockList).not.toHaveBeenCalled();
  });

  it('(U3) Filter-Wechsel triggert neuen Fetch (unterschiedlicher Cache-Key)', async () => {
    mockList.mockResolvedValueOnce({ data: [], meta: {} });
    mockList.mockResolvedValueOnce({ data: [ROW], meta: {} });

    const { wrapper } = makeWrapper();
    const { result, rerender } = renderHook(({ filter }: { filter: { unfallkasseRelevant?: boolean } }) => useListVorfaelle('einsatz-1', filter), {
      wrapper,
      initialProps: { filter: {} },
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(mockList).toHaveBeenCalledTimes(1);

    rerender({ filter: { unfallkasseRelevant: true } });

    await waitFor(() => expect(result.current.data).toEqual([ROW]));
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('(U4) stableFilterHash erzeugt deterministischen Hash unabhängig von Property-Reihenfolge', () => {
    const a = stableFilterHash({ einheitIds: ['b', 'a'], unfallkasseRelevant: true, vorfallZeitVon: '2026-05-01T00:00:00.000Z' });
    const b = stableFilterHash({ vorfallZeitVon: '2026-05-01T00:00:00.000Z', unfallkasseRelevant: true, einheitIds: ['a', 'b'] });
    expect(a).toBe(b);
  });

  it('(U5) vorfallListQueryKey hängt unter byEinsatz, damit useReportVorfall.onSuccess die Liste invalidiert', () => {
    const key = vorfallListQueryKey('einsatz-1', { unfallkasseRelevant: true });
    expect(key[0]).toBe('eigenschutz-vorfaelle');
    expect(key[1]).toBe('einsatz-1');
    expect(key[2]).toBe('list');
    expect(typeof key[3]).toBe('string');
  });
});
