/**
 * Tests für `useEigenschutzKonfliktErkanntLive` (Story 3.9 AC8).
 *
 * Pattern: 1:1 zu `use-eigenschutz-luecke-gemeldet-live.spec.tsx`.
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

import { __resetKonfliktErkanntRegistryForTests, findAndDismissNoticeByEntity, useEigenschutzKonfliktErkanntLive } from '../use-eigenschutz-konflikt-erkannt-live';
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
  entityType: 'PSA_PROFIL_ZUWEISUNG',
  entityId: 'zuweisung-1',
  fieldPath: 'profil',
  serverVersion: 6,
  localExpectedVersion: 5,
  reportedByUserId: 'user-loser',
  occurredAt: '2026-05-04T10:30:00.000Z',
  ...overrides,
});

describe('useEigenschutzKonfliktErkanntLive (Story 3.9 AC8)', () => {
  beforeEach(() => {
    ioMock.mockReset();
    ioMock.mockReturnValue(mockSocket);
    mockOn.mockReset();
    mockEmit.mockReset();
    mockDisconnect.mockReset();
    mockRemoveAllListeners.mockReset();
    loggerMock.warn.mockReset();
    loggerMock.debug.mockReset();
    __resetKonfliktErkanntRegistryForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetKonfliktErkanntRegistryForTests();
  });

  it('öffnet WS-Verbindung und joint den Einsatz-Room', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledWith('https://backend.test/ws/einsatz-events', expect.objectContaining({ transports: ['websocket'], reconnection: false }));
    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    act(() => connect?.());
    expect(mockEmit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'einsatz-1' });
  });

  it('valider Frame: Notice landet im State + invalidiert psaProfileByEinheit', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });

    const handler = getHandler('eigenschutz:konflikt-erkannt');
    act(() => handler?.(validPayload()));

    expect(result.current.notices).toHaveLength(1);
    expect(result.current.notices[0]).toEqual(expect.objectContaining({ eventId: 'evt-1', entityType: 'PSA_PROFIL_ZUWEISUNG' }));
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit('einsatz-1', 'einheit-1')]));
  });

  it('LRU-Dedup: gleicher eventId 2× → nur 1× im State', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-erkannt');
    act(() => {
      handler?.(validPayload());
      handler?.(validPayload());
    });
    expect(result.current.notices).toHaveLength(1);
  });

  it('Schema-Drift: Frame ohne entityId → State leer, console.warn 1×', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-erkannt');
    act(() => handler?.({ eventId: 'evt-broken', einsatzId: 'einsatz-1' }));
    expect(result.current.notices).toHaveLength(0);
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('useEigenschutzKonfliktErkanntLive'), expect.objectContaining({ issues: expect.any(Array) }));
  });

  it('Cross-Einsatz-Isolation: Frame mit fremder einsatzId wird verworfen', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-erkannt');
    act(() => handler?.(validPayload({ einsatzId: 'fremder-einsatz' })));
    expect(result.current.notices).toHaveLength(0);
  });

  it('dismissNotice entfernt Notice aus dem State', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-erkannt');
    act(() => handler?.(validPayload()));
    expect(result.current.notices).toHaveLength(1);
    act(() => result.current.dismissNotice('evt-1'));
    expect(result.current.notices).toHaveLength(0);
  });

  it('einheitId === null wird akzeptiert (Schema-Phase-2-Forward-Compat); KEINE Cache-Invalidation; GB-Frames werden NICHT in notices aufgenommen (Code-Review P8)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-erkannt');
    invalidateSpy.mockClear();
    act(() => handler?.(validPayload({ einheitId: null, entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' })));
    // Story 3.9 ist PSA-only. GB-Frames passieren das Zod-Schema (Phase-2-
    // Schema-Forward-Compat), werden aber vom Hook gefiltert (Banner ist
    // PSA-spezifisch, Story 3.10+ bringt eigenes GB-UI).
    expect(result.current.notices).toHaveLength(0);
    // Keine psaProfileByEinheit-Invalidation für GB-Frames.
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys.flat()).not.toContain('psaProfileByEinheit');
  });

  it('GEFAEHRDUNGSBEURTEILUNG_ITEM mit gesetztem einheitId triggert KEINE psaProfileByEinheit-Invalidation (Code-Review P5)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
    const handler = getHandler('eigenschutz:konflikt-erkannt');
    invalidateSpy.mockClear();
    act(() => handler?.(validPayload({ einheitId: 'einheit-1', entityType: 'GEFAEHRDUNGSBEURTEILUNG_ITEM' })));
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey).flat();
    // GB darf keinen PSA-Cache invalidieren — falscher Cache.
    expect(keys).not.toContain('psaProfileByEinheit');
  });

  describe('findAndDismissNoticeByEntity (Story 3.10 AC7 §4 — Cross-Hook-Helper)', () => {
    it('dismisst die Notice mit passendem Composite-Key (entityId + entityType + fieldPath)', () => {
      const client = makeClient();
      const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
      const handler = getHandler('eigenschutz:konflikt-erkannt');
      act(() => handler?.(validPayload({ eventId: 'evt-erkannt-1', entityId: 'zuweisung-1', fieldPath: 'profil' })));
      expect(result.current.notices).toHaveLength(1);

      let dismissed = 0;
      act(() => {
        dismissed = findAndDismissNoticeByEntity({
          einsatzId: 'einsatz-1',
          entityId: 'zuweisung-1',
          entityType: 'PSA_PROFIL_ZUWEISUNG',
          fieldPath: 'profil',
        });
      });

      expect(dismissed).toBe(1);
      expect(result.current.notices).toHaveLength(0);
    });

    it('liefert 0 + lässt Notice unverändert, wenn kein Composite-Key matcht', () => {
      const client = makeClient();
      const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
      const handler = getHandler('eigenschutz:konflikt-erkannt');
      act(() => handler?.(validPayload({ entityId: 'zuweisung-1', fieldPath: 'profil' })));

      let dismissed = -1;
      act(() => {
        dismissed = findAndDismissNoticeByEntity({
          einsatzId: 'einsatz-1',
          entityId: 'zuweisung-OTHER',
          entityType: 'PSA_PROFIL_ZUWEISUNG',
          fieldPath: 'profil',
        });
      });

      expect(dismissed).toBe(0);
      expect(result.current.notices).toHaveLength(1);
    });

    it('Cross-Einsatz-Isolation: dismisst keine Notice in einem fremden Einsatz', () => {
      const client = makeClient();
      const { result } = renderHook(() => useEigenschutzKonfliktErkanntLive({ einsatzId: 'einsatz-1' }), { wrapper: wrapper(client) });
      const handler = getHandler('eigenschutz:konflikt-erkannt');
      act(() => handler?.(validPayload({ entityId: 'zuweisung-1', fieldPath: 'profil' })));

      let dismissed = -1;
      act(() => {
        dismissed = findAndDismissNoticeByEntity({
          einsatzId: 'fremder-einsatz',
          entityId: 'zuweisung-1',
          entityType: 'PSA_PROFIL_ZUWEISUNG',
          fieldPath: 'profil',
        });
      });

      expect(dismissed).toBe(0);
      expect(result.current.notices).toHaveLength(1);
    });
  });
});
