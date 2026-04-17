import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

const mockListVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerListVAlpha: mockListVAlpha,
    }),
  },
}));

import { GEFAHRENZONE_QUERY_KEYS, useGefahrenzonen } from '../queries';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('GEFAHRENZONE_QUERY_KEYS', () => {
  it('bildet stabile Keys pro Einsatz', () => {
    expect(GEFAHRENZONE_QUERY_KEYS.all).toEqual(['gefahrenzonen']);
    expect(GEFAHRENZONE_QUERY_KEYS.byEinsatz('e-1')).toEqual(['gefahrenzonen', 'e-1']);
    expect(GEFAHRENZONE_QUERY_KEYS.byEinsatz('e-1')).toEqual(GEFAHRENZONE_QUERY_KEYS.byEinsatz('e-1'));
  });
});

describe('useGefahrenzonen', () => {
  beforeEach(() => {
    mockListVAlpha.mockReset();
  });

  it('ist deaktiviert ohne einsatzId', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefahrenzonen(''), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListVAlpha).not.toHaveBeenCalled();
  });

  it('lädt die Zonen aus dem Wrapped-Response', async () => {
    const zonen = [{ id: 'z1', einsatzId: 'e1' } as GefahrenzoneDto];
    mockListVAlpha.mockResolvedValueOnce({ data: { einsatzId: 'e1', zonen } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefahrenzonen('e1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(zonen));
    expect(mockListVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1' });
  });
});
