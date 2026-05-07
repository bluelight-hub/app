import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzVorfallControllerGetVorfallVAlpha: mockGet,
    }),
  },
}));

import { useGetVorfall, vorfallDetailQueryKey } from '../use-get-vorfall';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

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
  unfallkasseRelevant: false,
  erfasstVonUserId: 'user-1',
  erfasstAm: '2026-05-06T10:00:00.000Z',
  kontextSnapshot: {},
  gefBeurteilungVersionId: null,
};

beforeEach(() => {
  mockGet.mockReset();
});

describe('useGetVorfall (Story 5.2 AC12)', () => {
  it('lädt den Vorfall via generierten Client und entpackt data', async () => {
    mockGet.mockResolvedValueOnce({ data: VORFALL_DTO, meta: {} });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetVorfall('einsatz-1', 'vorfall-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(VORFALL_DTO));
    expect(mockGet).toHaveBeenCalledWith({ einsatzId: 'einsatz-1', vorfallId: 'vorfall-1' });
  });

  it('ist deaktiviert, wenn vorfallId leer ist', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGetVorfall('einsatz-1', undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('liefert hierarchischen detail-Query-Key', () => {
    expect(vorfallDetailQueryKey('einsatz-1', 'vorfall-1')).toEqual(['eigenschutz-vorfaelle', 'einsatz-1', 'detail', 'vorfall-1']);
  });
});
