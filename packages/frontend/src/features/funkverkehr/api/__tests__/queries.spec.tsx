/**
 * Unit Tests für Funkverkehr Query-Hooks.
 *
 * Verifiziert Query-Key-Factory, Enabled-Gating und delegierten API-Aufruf.
 */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const funkkanalControllerListVAlpha = vi.fn();
const rufnameVorschlaegeControllerListVAlpha = vi.fn();
const funkkanalControllerGetByIdVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    funkkanal: () => ({
      funkkanalControllerListVAlpha,
      rufnameVorschlaegeControllerListVAlpha,
      funkkanalControllerGetByIdVAlpha,
    }),
  },
}));

import { FUNKVERKEHR_QUERY_KEYS, useFunkkanal, useKanalplan, useRufnameVorschlaege } from '../queries';

const wrapper = (client: QueryClient) => {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

describe('FUNKVERKEHR_QUERY_KEYS', () => {
  it('erzeugt deterministische Keys', () => {
    expect(FUNKVERKEHR_QUERY_KEYS.kanalplan('e1')).toEqual(['funkverkehr', 'kanalplan', 'e1']);
    expect(FUNKVERKEHR_QUERY_KEYS.kanal('e1', 'k1')).toEqual(['funkverkehr', 'kanal', 'e1', 'k1']);
    expect(FUNKVERKEHR_QUERY_KEYS.rufnamenVorschlaege('e1')).toEqual(['funkverkehr', 'rufnamen-vorschlaege', 'e1']);
    expect(FUNKVERKEHR_QUERY_KEYS.funkprotokoll('e1', { k: 1 })).toEqual(['funkverkehr', 'funkprotokoll', 'e1', { k: 1 }]);
  });
});

describe('useKanalplan', () => {
  beforeEach(() => {
    funkkanalControllerListVAlpha.mockReset();
  });

  it('ruft API mit einsatzId und includeArchived=false auf (Default)', async () => {
    funkkanalControllerListVAlpha.mockResolvedValue({ data: [], meta: { requestId: 'r1', timestamp: 'now' } });

    const client = createClient();
    const { result } = renderHook(() => useKanalplan({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(funkkanalControllerListVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1', includeArchived: false });
  });

  it('bleibt disabled bei leerer einsatzId', () => {
    const client = createClient();
    const { result } = renderHook(() => useKanalplan({ einsatzId: '' }), { wrapper: wrapper(client) });

    expect(result.current.fetchStatus).toBe('idle');
    expect(funkkanalControllerListVAlpha).not.toHaveBeenCalled();
  });
});

describe('useRufnameVorschlaege', () => {
  beforeEach(() => rufnameVorschlaegeControllerListVAlpha.mockReset());

  it('delegiert an api.funkkanal()', async () => {
    rufnameVorschlaegeControllerListVAlpha.mockResolvedValue({ data: { fahrzeuge: [], personen: [], einheiten: [] }, meta: { requestId: 'r', timestamp: 'now' } });

    const client = createClient();
    const { result } = renderHook(() => useRufnameVorschlaege({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rufnameVorschlaegeControllerListVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1' });
  });
});

describe('useFunkkanal', () => {
  beforeEach(() => funkkanalControllerGetByIdVAlpha.mockReset());

  it('lädt einzelnen Kanal per ID', async () => {
    funkkanalControllerGetByIdVAlpha.mockResolvedValue({ data: { id: 'k1' }, meta: { requestId: 'r', timestamp: 'now' } });

    const client = createClient();
    const { result } = renderHook(() => useFunkkanal({ einsatzId: 'e1', kanalId: 'k1' }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(funkkanalControllerGetByIdVAlpha).toHaveBeenCalledWith({ einsatzId: 'e1', kanalId: 'k1' });
  });
});
