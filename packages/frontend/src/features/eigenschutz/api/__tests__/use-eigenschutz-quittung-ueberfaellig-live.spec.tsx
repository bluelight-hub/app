/**
 * Tests für `useEigenschutzQuittungUeberfaelligLive` (Story 3.7 AC6).
 *
 * Pattern: 1:1 zu `use-eigenschutz-luecke-gemeldet-live.spec.tsx`. Mockt
 * `socket.io-client`, `useCurrentUser` und prüft Connect-Lifecycle,
 * Payload-Validation, LRU-Dedup, Cache-Invalidate, Telemetrie-Push +
 * Notice-Buffer + Dismiss-API.
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

const { loggerMock, userMock } = vi.hoisted(() => ({
  loggerMock: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  userMock: { user: { id: 'user-current' } as { id: string } | null },
}));
vi.mock('@/shared/lib/logger', () => ({
  logger: loggerMock,
}));
vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => userMock,
}));

import { useEigenschutzQuittungUeberfaelligLive } from '../use-eigenschutz-quittung-ueberfaellig-live';
import { EIGENSCHUTZ_QUERY_KEYS } from '../queries';
import { eigenschutzTelemetryQueue } from '../../lib/telemetry-queue';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const getHandler = (event: string): ((payload?: unknown) => void) | undefined => {
  const matches = mockOn.mock.calls.filter(([name]) => name === event);
  return matches.length > 0 ? (matches[matches.length - 1]?.[1] as ((payload?: unknown) => void) | undefined) : undefined;
};

const validPayload = (overrides: Partial<Record<string, unknown>> = {}) => ({
  eventId: 'evt-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  propagationGroupId: 'group-1',
  originalEventId: 'orig-1',
  ueberfaelligSeitMin: 6,
  zuweisungId: 'zuw-1',
  occurredAt: '2026-04-29T10:00:00.000Z',
  ...overrides,
});

describe('useEigenschutzQuittungUeberfaelligLive (Story 3.7 AC6)', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue(mockSocket);
    mockOn.mockReset();
    mockEmit.mockReset();
    mockDisconnect.mockReset();
    mockRemoveAllListeners.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.debug.mockReset();
    userMock.user = { id: 'user-current' };
    eigenschutzTelemetryQueue.drain();
    vi.useFakeTimers();
  });

  afterEach(() => {
    eigenschutzTelemetryQueue.drain();
    vi.useRealTimers();
  });

  it('öffnet WS-Verbindung und joint den Einsatz-Room', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledWith('https://backend.test/ws/einsatz-events', expect.objectContaining({ transports: ['websocket'], reconnection: false }));

    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    act(() => connect?.());
    expect(mockEmit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'einsatz-1' });
  });

  it('hängt valide Notice an den Buffer und invalidiert Caches', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    invalidateSpy.mockClear();
    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload());
    });

    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]).toEqual({
      propagationGroupId: 'group-1',
      einheitId: 'einheit-1',
      ueberfaelligSeitMin: 6,
      occurredAt: '2026-04-29T10:00:00.000Z',
      zuweisungId: 'zuw-1',
    });

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([EIGENSCHUTZ_QUERY_KEYS.psaQuittungen('einsatz-1', 'group-1'), EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben('einsatz-1')]));
  });

  it('verwirft ungültige Payloads vor dem Dedup-Cache (Validation-vor-Dedup)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.({ eventId: 'broken', einsatzId: 'einsatz-1' });
    });

    expect(result.current.notices).toHaveLength(0);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it('verwirft Frames mit ueberfaelligSeitMin === -1 (negativer Integer)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload({ ueberfaelligSeitMin: -1 }));
    });

    expect(result.current.notices).toHaveLength(0);
  });

  it('akzeptiert zuweisungId === null', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload({ zuweisungId: null }));
    });

    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0].zuweisungId).toBeNull();
  });

  it('dedupliziert per eventId — selbe Frame nur einmal verarbeitet', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload({ eventId: 'evt-A' }));
    });
    act(() => {
      handler?.(validPayload({ eventId: 'evt-A' }));
    });

    expect(result.current.notices).toHaveLength(1);
  });

  it('filtert Frames anderer Einsätze (Defense-in-Depth)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload({ einsatzId: 'einsatz-fremd' }));
    });

    expect(result.current.notices).toHaveLength(0);
  });

  it('pushed pro neuer Notice genau ein quittung_ueberfaellig-Telemetrie-Event', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload({ eventId: 'evt-1' }));
    });
    act(() => {
      handler?.(validPayload({ eventId: 'evt-1' })); // Dup
    });

    const events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'quittung_ueberfaellig');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        propagationGroupIdCandidate: 'group-1',
        userId: 'user-current',
        abschnittCount: 1,
        metadata: expect.objectContaining({
          einheitIdCandidate: 'einheit-1',
          ueberfaelligSeitMin: 6,
          originalEventIdCandidate: 'orig-1',
        }),
      }),
    );
  });

  it('skippt Telemetrie-Push, wenn user.id nicht verfügbar', () => {
    userMock.user = null;
    const client = makeClient();
    renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload());
    });

    expect(eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'quittung_ueberfaellig')).toHaveLength(0);
  });

  it('dismiss(propagationGroupId, einheitId) entfernt den Eintrag aus notices', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:quittung-ueberfaellig');
    act(() => {
      handler?.(validPayload());
    });
    expect(result.current.notices).toHaveLength(1);

    act(() => {
      result.current.dismiss('group-1', 'einheit-1');
    });
    expect(result.current.notices).toHaveLength(0);
  });

  it('schaltet status auf reconnecting bei disconnect-Event', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzQuittungUeberfaelligLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const disconnect = getHandler('disconnect');
    act(() => disconnect?.('transport close'));

    expect(result.current.status).toBe('reconnecting');
  });
});
