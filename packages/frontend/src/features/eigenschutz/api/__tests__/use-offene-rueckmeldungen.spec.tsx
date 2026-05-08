import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListOffeneRueckmeldungen = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      psaProfilControllerListOffeneRueckmeldungenVAlpha: mockListOffeneRueckmeldungen,
    }),
  },
}));

vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1' } }),
}));

import { EIGENSCHUTZ_QUERY_KEYS, useOffeneRueckmeldungen } from '../queries';

const EINSATZ_ID = 'einsatz-1';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });

describe('useOffeneRueckmeldungen (Story 6.4)', () => {
  beforeEach(() => {
    mockListOffeneRueckmeldungen.mockReset();
  });

  it('nutzt den Story-6.4-Query-Key', () => {
    expect(EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen(EINSATZ_ID)).toEqual(['eigenschutz', EINSATZ_ID, 'psa-profile', 'rueckmeldungen', 'offen']);
  });

  it('ruft den generierten Client mit einsatzId auf', async () => {
    mockListOffeneRueckmeldungen.mockResolvedValue({
      data: [
        {
          propagationGroupId: 'group-1',
          einsatzId: EINSATZ_ID,
          einheitId: 'einheit-1',
          lueckeNotiz: 'Filterpatrone fehlt',
          gemeldetAm: '2026-05-08T09:42:13.000Z',
          begruendungAnriss: 'CBRN-Lage',
        },
      ],
    });
    const client = makeClient();

    const { result } = renderHook(() => useOffeneRueckmeldungen(EINSATZ_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListOffeneRueckmeldungen).toHaveBeenCalledWith({ einsatzId: EINSATZ_ID });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.lueckeNotiz).toBe('Filterpatrone fehlt');
  });

  it('liefert ein leeres Array bei leerer Response', async () => {
    mockListOffeneRueckmeldungen.mockResolvedValue({ data: [] });
    const client = makeClient();

    const { result } = renderHook(() => useOffeneRueckmeldungen(EINSATZ_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('ist deaktiviert, wenn einsatzId fehlt', () => {
    const client = makeClient();

    const { result } = renderHook(() => useOffeneRueckmeldungen(''), { wrapper: wrapper(client) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListOffeneRueckmeldungen).not.toHaveBeenCalled();
  });

  it('respektiert options.enabled=false', () => {
    const client = makeClient();

    const { result } = renderHook(() => useOffeneRueckmeldungen(EINSATZ_ID, { enabled: false }), { wrapper: wrapper(client) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockListOffeneRueckmeldungen).not.toHaveBeenCalled();
  });

  it('setzt silentError-Meta und reicht Fehler ohne Toast-Pfad weiter', async () => {
    const fetchError = Object.assign(new Error('forbidden'), { response: { status: 403 } });
    mockListOffeneRueckmeldungen.mockRejectedValue(fetchError);
    const client = makeClient();

    const { result } = renderHook(() => useOffeneRueckmeldungen(EINSATZ_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(fetchError);
    const query = client.getQueryCache().find({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen(EINSATZ_ID) });
    expect(query?.meta).toEqual({ silentError: true });
  });
});
