import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuittieren = vi.fn();
const mockListQuittungen = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    eigenschutz: () => ({
      sicherheitsregelControllerQuittierenVAlpha: mockQuittieren,
      sicherheitsregelControllerListQuittungenVAlpha: mockListQuittungen,
    }),
  },
}));

import { EIGENSCHUTZ_QUERY_KEYS, useAckSicherheitsregel, useSicherheitsregelQuittungen } from '../queries';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

const EINSATZ_ID = 'einsatz-1';
const REGEL_ID = 'regel-1';
const EINHEIT_ID = 'einheit-1';

describe('useAckSicherheitsregel (Story 2.7)', () => {
  beforeEach(() => {
    mockQuittieren.mockReset();
    mockListQuittungen.mockReset();
  });

  it('sendet Mutation an quittieren-Endpoint und invalidiert relevante Caches', async () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    mockQuittieren.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAckSicherheitsregel(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ id: REGEL_ID, einheitId: EINHEIT_ID });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuittieren).toHaveBeenCalledWith({
      einsatzId: EINSATZ_ID,
      id: REGEL_ID,
      ackSicherheitsregelDto: { einheitId: EINHEIT_ID, expectedRegelVersion: undefined },
    });

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => call[0]?.queryKey);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        expect.arrayContaining(['eigenschutz', EINSATZ_ID, 'sicherheitsregeln', 'list']),
        EIGENSCHUTZ_QUERY_KEYS.sicherheitsregel(EINSATZ_ID, REGEL_ID),
        EIGENSCHUTZ_QUERY_KEYS.sicherheitsregelQuittungen(EINSATZ_ID, REGEL_ID),
      ]),
    );
  });

  it('reicht expectedRegelVersion an den Endpoint durch (OCC)', async () => {
    const client = makeClient();
    mockQuittieren.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAckSicherheitsregel(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ id: REGEL_ID, einheitId: EINHEIT_ID, expectedRegelVersion: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQuittieren).toHaveBeenCalledWith(
      expect.objectContaining({
        ackSicherheitsregelDto: { einheitId: EINHEIT_ID, expectedRegelVersion: 3 },
      }),
    );
  });

  it('reicht Fehler unverändert weiter (Zero-Toast — UI rendert inline)', async () => {
    const client = makeClient();
    const fetchError = new Error('boom');
    mockQuittieren.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useAckSicherheitsregel(EINSATZ_ID), { wrapper: wrapper(client) });

    result.current.mutate({ id: REGEL_ID, einheitId: EINHEIT_ID });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(fetchError);
  });
});

describe('useSicherheitsregelQuittungen (Story 2.7)', () => {
  beforeEach(() => {
    mockListQuittungen.mockReset();
  });

  it('liefert die Liste über den generierten Endpoint', async () => {
    mockListQuittungen.mockResolvedValue({
      data: [{ einheitId: 'e-1', einheitName: '1. Sangruppe', quittiertAm: '2026-04-27T08:42:13.000Z', quittiertVonUserId: 'u-1' }],
    });
    const client = makeClient();
    const { result } = renderHook(() => useSicherheitsregelQuittungen(EINSATZ_ID, REGEL_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toEqual(expect.objectContaining({ einheitId: 'e-1', einheitName: '1. Sangruppe', quittiertVonUserId: 'u-1' }));
  });

  it('liefert leeres Array wenn das Backend kein Array sendet (Defensive)', async () => {
    mockListQuittungen.mockResolvedValue({ data: null });
    const client = makeClient();
    const { result } = renderHook(() => useSicherheitsregelQuittungen(EINSATZ_ID, REGEL_ID), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
