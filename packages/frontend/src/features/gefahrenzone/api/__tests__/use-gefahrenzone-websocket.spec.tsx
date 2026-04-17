import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type Handler = (payload?: unknown) => void;

const handlers = new Map<string, Handler>();
let lastInvalidate: ((options: { queryKey: readonly unknown[] }) => void) | null = null;

const fakeSocket = {
  on: vi.fn((event: string, handler: Handler) => {
    handlers.set(event, handler);
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => fakeSocket),
}));

vi.mock('@/shared/api/client', () => ({
  getBaseUrl: () => 'http://localhost:3091',
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { GEFAHRENZONE_QUERY_KEYS } from '../queries';
import { GEFAHRENZONE_WS_EVENTS, useGefahrenzoneWebSocket } from '../use-gefahrenzone-websocket';

function makeWrapper() {
  const client = new QueryClient();
  lastInvalidate = vi.fn();
  const originalInvalidate = client.invalidateQueries.bind(client);
  client.invalidateQueries = (options) => {
    lastInvalidate!(options as { queryKey: readonly unknown[] });
    return originalInvalidate(options);
  };
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('useGefahrenzoneWebSocket', () => {
  beforeEach(() => {
    handlers.clear();
    fakeSocket.on.mockClear();
    fakeSocket.emit.mockClear();
    fakeSocket.disconnect.mockClear();
  });

  it('registriert genau die drei Gefahrenzone-Events', () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useGefahrenzoneWebSocket({ einsatzId: 'e-1' }), { wrapper });

    expect(handlers.has(GEFAHRENZONE_WS_EVENTS.erstellt)).toBe(true);
    expect(handlers.has(GEFAHRENZONE_WS_EVENTS.geometryGeaendert)).toBe(true);
    expect(handlers.has(GEFAHRENZONE_WS_EVENTS.geloescht)).toBe(true);
  });

  it('invalidiert den Query-Cache bei jedem der drei Events', () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useGefahrenzoneWebSocket({ einsatzId: 'e-1' }), { wrapper });

    act(() => handlers.get(GEFAHRENZONE_WS_EVENTS.erstellt)!({}));
    act(() => handlers.get(GEFAHRENZONE_WS_EVENTS.geometryGeaendert)!({}));
    act(() => handlers.get(GEFAHRENZONE_WS_EVENTS.geloescht)!({}));

    expect(lastInvalidate).toHaveBeenCalledTimes(3);
    expect(lastInvalidate).toHaveBeenLastCalledWith({ queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz('e-1') });
  });

  it('ist im disabled-Mode passiv (keine Socket-Registrierung)', () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useGefahrenzoneWebSocket({ einsatzId: 'e-1', enabled: false }), { wrapper });
    expect(fakeSocket.on).not.toHaveBeenCalled();
  });
});
