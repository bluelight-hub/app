/**
 * Tests für `useEinsatzEvents`.
 *
 * Verifiziert Connection-Lifecycle, Event-Invalidation und Backoff.
 */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockRemoveAllListeners = vi.fn();
const mockSocket = {
  on: mockOn,
  emit: mockEmit,
  disconnect: mockDisconnect,
  removeAllListeners: mockRemoveAllListeners,
};

const ioMock = vi.fn(() => mockSocket);

vi.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

vi.mock('@/shared/api/api', () => ({
  getBaseUrl: () => 'https://backend.test',
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { EINSATZ_EVENTS_BACKOFF_MS, EINSATZ_EVENTS_NAMESPACE, useEinsatzEvents } from '../use-einsatz-events';
import { FUNKVERKEHR_QUERY_KEYS } from '../queries';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const getHandler = (event: string): ((payload?: unknown) => void) | undefined => {
  const match = mockOn.mock.calls.find(([name]) => name === event);
  return match?.[1] as ((payload?: unknown) => void) | undefined;
};

describe('useEinsatzEvents', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue(mockSocket);
    mockOn.mockReset();
    mockEmit.mockReset();
    mockDisconnect.mockReset();
    mockRemoveAllListeners.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('öffnet Verbindung zum erwarteten Namespace und joint den Einsatz-Room', () => {
    const client = makeClient();
    renderHook(() => useEinsatzEvents({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledWith(`https://backend.test${EINSATZ_EVENTS_NAMESPACE}`, expect.objectContaining({ transports: ['websocket'], reconnection: false }));

    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    act(() => connect?.());
    expect(mockEmit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'e1' });
  });

  it('invalidiert Funkprotokoll-Cache bei etb:eintrag-erstellt', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEinsatzEvents({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    const handler = getHandler('etb:eintrag-erstellt');
    expect(handler).toBeDefined();
    act(() => handler?.());

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FUNKVERKEHR_QUERY_KEYS.funkprotokoll('e1') });
  });

  it('invalidiert Kanalplan bei allen funkkanal:*-Events', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEinsatzEvents({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    for (const channel of ['funkkanal:erstellt', 'funkkanal:geaendert', 'funkkanal:archiviert', 'funkkanal:reihenfolge-geaendert', 'funkkanal:zuordnung-erstellt', 'funkkanal:zuordnung-entfernt']) {
      invalidateSpy.mockClear();
      const handler = getHandler(channel);
      act(() => handler?.());
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan('e1') });
    }
  });

  it('ruft onNotfall-Callback bei funk:notfall-alert auf', () => {
    const client = makeClient();
    const onNotfall = vi.fn();
    renderHook(() => useEinsatzEvents({ einsatzId: 'e1', onNotfall }), { wrapper: wrapper(client) });

    const handler = getHandler('funk:notfall-alert');
    const payload = {
      einsatzId: 'e1',
      kanalId: 'k1',
      text: 'Mayday',
      ereignisZeitpunkt: '2026-04-15T12:00:00.000Z',
    };
    act(() => handler?.(payload));

    expect(onNotfall).toHaveBeenCalledWith(payload);
  });

  it('nutzt den Backoff-Schedule bei Disconnect', () => {
    const client = makeClient();
    renderHook(() => useEinsatzEvents({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    const disconnect = getHandler('disconnect');
    expect(disconnect).toBeDefined();

    // Erste Disconnect → 1s Backoff
    act(() => {
      disconnect?.('transport close');
    });
    expect(ioMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(EINSATZ_EVENTS_BACKOFF_MS[0]);
    });
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

  it('connectet nicht, wenn enabled=false', () => {
    const client = makeClient();
    renderHook(() => useEinsatzEvents({ einsatzId: 'e1', enabled: false }), { wrapper: wrapper(client) });
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('räumt beim Unmount auf', () => {
    const client = makeClient();
    const { unmount } = renderHook(() => useEinsatzEvents({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    unmount();
    expect(mockRemoveAllListeners).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
