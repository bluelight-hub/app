/**
 * Spec für `useEigenschutzAmpelStatus` (Story 6.1, T7).
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAmpel = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      eigenschutzAmpelControllerGetAmpelVAlpha: mockGetAmpel,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS } from '../queries';
import { useEigenschutzAmpelStatus } from '../use-eigenschutz-ampel-status';

const AMPEL_STATUS = [
  {
    einsatzId: 'einsatz-1',
    einheitId: 'einheit-1',
    status: 'GELB' as const,
    aktivePsaProfile: ['BRAND'] as const,
    offeneGefaehrdungenHoch: 1,
    ausstehendePsaQuittungen: 2,
    ausstehendeRegelQuittungen: 0,
    offeneVorfaelle: 0,
    ungeloesteRueckmeldungen: 1,
    letzteAenderungAm: '2026-05-07T08:30:00.000Z',
    letzteAenderungVonUserId: 'user-1',
  },
];

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => {
  mockGetAmpel.mockReset();
});

describe('useEigenschutzAmpelStatus (Story 6.1, T7)', () => {
  it('lädt den Ampelstatus via generiertem Client und entpackt data', async () => {
    mockGetAmpel.mockResolvedValueOnce({ data: AMPEL_STATUS });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useEigenschutzAmpelStatus('einsatz-1'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(AMPEL_STATUS));
    expect(mockGetAmpel).toHaveBeenCalledWith({ einsatzId: 'einsatz-1' });
  });

  it('ist deaktiviert, wenn einsatzId fehlt', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useEigenschutzAmpelStatus(undefined), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetAmpel).not.toHaveBeenCalled();
  });

  it('liefert den Eigenschutz-Ampel-Query-Key', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.ampelStatus('einsatz-1')).toEqual(['eigenschutz', 'einsatz-1', 'ampel-status']);
  });
});
