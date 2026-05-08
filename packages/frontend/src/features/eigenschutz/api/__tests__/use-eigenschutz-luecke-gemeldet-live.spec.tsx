/**
 * Tests für `useEigenschutzLueckeGemeldetLive` (Story 3.6 AC14).
 *
 * Pattern: 1:1 zu `use-eigenschutz-psa-quittung-live.spec.tsx`. Mocks
 * `socket.io-client` mit einem Manual-Event-Emitter und prüft das
 * Connect-Lifecycle, Payload-Validation, Dedup und Cache-Invalidate.
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

const { loggerMock } = vi.hoisted(() => ({
  loggerMock: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('@/shared/lib/logger', () => ({
  logger: loggerMock,
}));

import { useEigenschutzLueckeGemeldetLive } from '../use-eigenschutz-luecke-gemeldet-live';
import { EIGENSCHUTZ_QUERY_KEYS } from '../queries';

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
  userIdHash: 'hash-abc',
  meldungLength: 42,
  gemeldetAm: '2026-04-24T10:30:00.000Z',
  occurredAt: '2026-04-24T10:30:00.000Z',
  ...overrides,
});

describe('useEigenschutzLueckeGemeldetLive (Story 3.6 AC14)', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue(mockSocket);
    mockOn.mockReset();
    mockEmit.mockReset();
    mockDisconnect.mockReset();
    mockRemoveAllListeners.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.debug.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('öffnet WS-Verbindung und joint den Einsatz-Room', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledWith('https://backend.test/ws/einsatz-events', expect.objectContaining({ transports: ['websocket'], reconnection: false }));

    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    act(() => connect?.());
    expect(mockEmit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'einsatz-1' });
  });

  it('invalidiert offene Bekanntgaben, offene Rückmeldungen und Ampelstatus nach Reconnect', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    invalidateSpy.mockClear();

    act(() => connect?.());

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben('einsatz-1'), EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen('einsatz-1'), EIGENSCHUTZ_QUERY_KEYS.ampelStatus('einsatz-1')]),
    );
  });

  it('invalidiert Quittungen, offene Bekanntgaben, offene Rückmeldungen, PSA-Profil und Ampelstatus bei validem Frame', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:luecke-gemeldet');
    expect(handler).toBeDefined();

    act(() => {
      handler?.(validPayload());
    });

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        EIGENSCHUTZ_QUERY_KEYS.psaQuittungen('einsatz-1', 'group-1'),
        EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben('einsatz-1'),
        EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen('einsatz-1'),
        EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit('einsatz-1', 'einheit-1'),
        EIGENSCHUTZ_QUERY_KEYS.ampelStatus('einsatz-1'),
      ]),
    );
  });

  it('verwirft ungültige Payloads vor dem Dedup-Cache (Validation-vor-Dedup)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:luecke-gemeldet');
    invalidateSpy.mockClear();

    act(() => {
      handler?.({ eventId: 'broken', einsatzId: 'einsatz-1' }); // fehlende Pflichtfelder
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it('verwirft Frames mit fehlerhaftem ISO-Timestamp', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:luecke-gemeldet');
    invalidateSpy.mockClear();

    act(() => {
      handler?.(validPayload({ gemeldetAm: 'nicht-iso' }));
    });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('dedupliziert per eventId — derselbe Event wird nur einmal verarbeitet', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:luecke-gemeldet');
    invalidateSpy.mockClear();

    act(() => {
      handler?.(validPayload({ eventId: 'evt-A' }));
    });
    act(() => {
      handler?.(validPayload({ eventId: 'evt-A' })); // Duplikat
    });

    const groupInvalidations = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey).filter((k) => Array.isArray(k) && k.includes('group-1'));
    expect(groupInvalidations).toHaveLength(1);
  });

  it('filtert Frames anderer Einsätze (Defense-in-Depth)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzLueckeGemeldetLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:luecke-gemeldet');
    invalidateSpy.mockClear();

    act(() => {
      handler?.(validPayload({ einsatzId: 'einsatz-fremd' }));
    });

    const groupInvalidations = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey).filter((k) => Array.isArray(k) && k.includes('group-1'));
    expect(groupInvalidations).toHaveLength(0);
  });
});
