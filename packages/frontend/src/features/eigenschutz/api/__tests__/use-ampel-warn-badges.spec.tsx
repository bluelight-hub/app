import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListWarnBadges = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzAmpelControllerListWarnBadgesVAlpha: mockListWarnBadges,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS } from '../queries';
import { useAmpelWarnBadges } from '../use-ampel-warn-badges';

const WARN_BADGES = [
  {
    id: 'gefahr:gef-1:item-1',
    einsatzId: 'einsatz-1',
    einheitId: 'einheit-1',
    type: 'GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME' as const,
    label: 'Gefährdung ohne Schutzmaßnahme',
    sortRank: 10,
    occurredAt: new Date('2026-05-08T10:00:00.000Z'),
    gefaehrdungsbeurteilungId: 'gef-1',
    gefaehrdungItemId: 'item-1',
    gefaehrdungTitel: 'Austretender Kraftstoff',
  },
];

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => {
  mockListWarnBadges.mockReset();
});

describe('useAmpelWarnBadges', () => {
  it('lädt Warn-Badges via generiertem Client und entpackt data', async () => {
    mockListWarnBadges.mockResolvedValueOnce({ data: WARN_BADGES });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useAmpelWarnBadges('einsatz-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(WARN_BADGES));
    expect(mockListWarnBadges).toHaveBeenCalledWith({ einsatzId: 'einsatz-1' });
  });

  it('ist deaktiviert, wenn einsatzId fehlt', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useAmpelWarnBadges(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListWarnBadges).not.toHaveBeenCalled();
  });

  it('liefert eine leere Liste, wenn der Wrapper keine data enthält', async () => {
    mockListWarnBadges.mockResolvedValueOnce({});
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useAmpelWarnBadges('einsatz-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('liefert den Warn-Badge-Query-Key', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.ampelWarnBadges('einsatz-1')).toEqual(['eigenschutz', 'einsatz-1', 'ampel-warn-badges']);
  });

  it('unterdrückt globale Toasts über silentError-Meta', async () => {
    mockListWarnBadges.mockRejectedValueOnce(new Error('network'));
    const { client, wrapper } = makeWrapper();

    renderHook(() => useAmpelWarnBadges('einsatz-1'), { wrapper });

    await waitFor(() => expect(client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelWarnBadges('einsatz-1') })?.options.meta).toEqual({ silentError: true }));
  });
});
