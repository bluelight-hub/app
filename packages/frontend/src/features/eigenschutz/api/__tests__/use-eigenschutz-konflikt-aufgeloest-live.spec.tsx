/**
 * Tests für `useEigenschutzKonfliktAufgeloestLive` (Story 3.10 AC7).
 *
 * Pattern: 1:1 zu `use-eigenschutz-konflikt-erkannt-live.spec.tsx`, aber
 * ohne Notice-State — der Hook invalidiert nur den Cache.
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

import { useEigenschutzKonfliktAufgeloestLive } from '../use-eigenschutz-konflikt-aufgeloest-live';
import { __resetKonfliktErkanntRegistryForTests, useEigenschutzKonfliktErkanntLive } from '../use-eigenschutz-konflikt-erkannt-live';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const getHandler = (event: string): ((payload?: unknown) => void) | undefined => {
  const matches = mockOn.mock.calls.filter(([name]) => name === event);
  return matches.length > 0 ? (matches[matches.length - 1]?.[1] as ((payload?: unknown) => void) | undefined) : undefined;
};

const validPayload = (overrides: Partial<Record<string, unknown>> = {}) => ({
  eventId: 'evt-aufg-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  syncConflictId: 'sc-1',
  entityType: 'PSA_PROFIL_ZUWEISUNG',
  entityId: 'zuweisung-1',
  fieldPath: 'profil',
  resolution: 'SERVER_WINS',
  resolvedAt: '2026-05-04T10:30:00.000Z',
  resolvedByUserId: 'user-resolver',
  ...overrides,
});

describe('useEigenschutzKonfliktAufgeloestLive (Story 3.10 AC7)', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue(mockSocket);
    mockOn.mockReset();
    mockEmit.mockReset();
    mockDisconnect.mockReset();
    mockRemoveAllListeners.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.debug.mockReset();
    loggerMock.info.mockReset();
    __resetKonfliktErkanntRegistryForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetKonfliktErkanntRegistryForTests();
  });

  it('öffnet WS-Verbindung und joint den Einsatz-Room', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledWith('https://backend.test/ws/einsatz-events', expect.objectContaining({ transports: ['websocket'], reconnection: false }));
    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    act(() => connect?.());
    expect(mockEmit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'einsatz-1' });
  });

  it('valider Frame: invalidiert sync-conflicts-Liste UND psa-profile (always-invalidate-both)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:konflikt-aufgeloest');
    invalidateSpy.mockClear();
    act(() => handler?.(validPayload()));

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    // Story 3.10: der Aufgelöst-Hook invalidiert IMMER beide Caches —
    // Liste (Konflikt verschwindet) und PSA-Profile (Server-State kann
    // bei LOCAL_WINS nachverschoben sein).
    expect(keys).toEqual(
      expect.arrayContaining([
        ['eigenschutz', 'einsatz-1', 'sync-conflicts'],
        ['eigenschutz', 'einsatz-1', 'psa-profile'],
      ]),
    );
  });

  it('LRU-Dedup: gleicher eventId 2× → Cache wird nur 1× invalidiert (pro Cache-Prefix)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-aufgeloest');
    invalidateSpy.mockClear();

    act(() => {
      handler?.(validPayload());
      handler?.(validPayload());
    });

    // 2 Frames mit gleichem eventId → 1× handlePayload → 2 invalidateQueries-
    // Calls (sync-conflicts + psa-profile), nicht 4.
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys.filter((k) => Array.isArray(k) && k[2] === 'sync-conflicts')).toHaveLength(1);
    expect(keys.filter((k) => Array.isArray(k) && k[2] === 'psa-profile')).toHaveLength(1);
  });

  it('Schema-Drift: ungültiger resolution-Wert → console.warn + skip, keine Invalidation', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-aufgeloest');
    invalidateSpy.mockClear();

    act(() => handler?.(validPayload({ resolution: 'BOGUS_RESOLUTION' })));

    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('useEigenschutzKonfliktAufgeloestLive'), expect.objectContaining({ issues: expect.any(Array) }));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('Cross-Einsatz-Isolation: Frame mit fremder einsatzId wird verworfen (kein invalidate)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-aufgeloest');
    invalidateSpy.mockClear();

    act(() => handler?.(validPayload({ einsatzId: 'fremder-einsatz' })));

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('Reconnect-Behavior: disconnect setzt Status reconnecting + plant Reconnect via Backoff', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const disconnect = getHandler('disconnect');
    expect(disconnect).toBeDefined();

    ioMock.mockClear();
    act(() => disconnect?.('transport close'));

    // Backoff-Schritt 1: 1s. Vor Ablauf: noch kein neuer io()-Call.
    expect(ioMock).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    // Nach Backoff: connect() läuft erneut → io() wird neu aufgerufen.
    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it('PII-Vertrag: kein voller cuid in logger.info/debug-Calls (nur stabile Konstanten)', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'clw3h8x9y0000qwertyuiopabcdef' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-aufgeloest');

    act(() => handler?.(validPayload({ einsatzId: 'clw3h8x9y0000qwertyuiopabcdef' })));

    // Alle info/debug-Calls dürfen weder den vollen Einsatz-Cuid noch den
    // ResolvedByUser-Cuid enthalten.
    const allInfoArgs = JSON.stringify([...loggerMock.info.mock.calls, ...loggerMock.debug.mock.calls]);
    expect(allInfoArgs).not.toContain('clw3h8x9y0000qwertyuiopabcdef');
    expect(allInfoArgs).not.toContain('user-resolver');
  });

  it('zwei verschiedene eventIds: invalidiert je einmal (kein Dedup-Falschpositiv)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-aufgeloest');
    invalidateSpy.mockClear();

    act(() => {
      handler?.(validPayload({ eventId: 'evt-1' }));
      handler?.(validPayload({ eventId: 'evt-2', resolution: 'LOCAL_WINS' }));
    });

    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    // 2 verschiedene Frames → 4 invalidate-Calls (je 2 pro Frame).
    expect(keys.filter((k) => Array.isArray(k) && k[2] === 'sync-conflicts')).toHaveLength(2);
    expect(keys.filter((k) => Array.isArray(k) && k[2] === 'psa-profile')).toHaveLength(2);
  });

  describe('Cross-Hook-Dismiss (Story 3.10 AC7 §4 + Code-Review D1)', () => {
    it('schließt den Story-3.9-Mikro-Banner für denselben Konflikt sofort, wenn Aufgeloest-Frame eintrifft', () => {
      const client = makeClient();
      // Beide Hooks im selben renderHook-Call teilen QueryClient + mockSocket.
      // Die internen Channel-Listener werden via getHandler(<channel>) auseinandergehalten —
      // socket.on() wird je Hook 1× pro Channel aufgerufen.
      const { result } = renderHook(
        () => ({
          erkannt: useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }),
          aufgeloest: useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }),
        }),
        { wrapper: wrapper(client) },
      );

      // 1. Erkannt-Frame → Notice landet im Erkannt-Store.
      const erkanntHandler = getHandler('eigenschutz:konflikt-erkannt');
      expect(erkanntHandler).toBeDefined();
      act(() =>
        erkanntHandler?.({
          eventId: 'evt-erkannt-cross',
          einsatzId: 'einsatz-1',
          einheitId: 'einheit-1',
          entityType: 'PSA_PROFIL_ZUWEISUNG',
          entityId: 'zuweisung-cross',
          fieldPath: 'profil',
          serverVersion: 6,
          localExpectedVersion: 5,
          reportedByUserId: 'user-loser',
          occurredAt: '2026-05-04T10:30:00.000Z',
        }),
      );
      expect(result.current.erkannt.notices).toHaveLength(1);

      // 2. Aufgeloest-Frame mit MATCHING Composite-Key (entityId + entityType + fieldPath),
      // aber ANDERER eventId — Korrelator über Entitäts-Koordinaten.
      const aufgeloestHandler = getHandler('eigenschutz:konflikt-aufgeloest');
      expect(aufgeloestHandler).toBeDefined();
      act(() =>
        aufgeloestHandler?.(
          validPayload({
            eventId: 'evt-aufg-cross',
            entityId: 'zuweisung-cross',
            entityType: 'PSA_PROFIL_ZUWEISUNG',
            fieldPath: 'profil',
          }),
        ),
      );

      // 3. Notice ist sofort verschwunden — kein Warten auf 30 s-Auto-Dismiss.
      expect(result.current.erkannt.notices).toHaveLength(0);
    });

    it('lässt Notice mit nicht-matchenden Entitäts-Koordinaten unverändert', () => {
      const client = makeClient();
      const { result } = renderHook(
        () => ({
          erkannt: useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }),
          aufgeloest: useEigenschutzKonfliktAufgeloestLive({ einsatzId: 'einsatz-1' }),
        }),
        { wrapper: wrapper(client) },
      );

      const erkanntHandler = getHandler('eigenschutz:konflikt-erkannt');
      act(() =>
        erkanntHandler?.({
          eventId: 'evt-erkannt-A',
          einsatzId: 'einsatz-1',
          einheitId: 'einheit-1',
          entityType: 'PSA_PROFIL_ZUWEISUNG',
          entityId: 'zuweisung-A',
          fieldPath: 'profil',
          serverVersion: 6,
          localExpectedVersion: 5,
          reportedByUserId: 'user-loser',
          occurredAt: '2026-05-04T10:30:00.000Z',
        }),
      );
      expect(result.current.erkannt.notices).toHaveLength(1);

      // Aufgeloest-Frame mit DIFFERENT entityId → kein Match, Notice bleibt.
      const aufgeloestHandler = getHandler('eigenschutz:konflikt-aufgeloest');
      act(() =>
        aufgeloestHandler?.(
          validPayload({
            eventId: 'evt-aufg-OTHER',
            entityId: 'zuweisung-OTHER',
            entityType: 'PSA_PROFIL_ZUWEISUNG',
            fieldPath: 'profil',
          }),
        ),
      );

      expect(result.current.erkannt.notices).toHaveLength(1);
    });
  });
});
