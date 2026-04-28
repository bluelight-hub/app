/**
 * Tests für `useEigenschutzPsaLiveBanner` (Story 3.3 AC1–AC5, AC12).
 *
 * Mocks `socket.io-client` mit einem Manual-Event-Emitter und prüft das
 * Connect-/Reconnect-Lifecycle, Payload-Validation, Dedup, Filter,
 * propagationGroup-Aggregation und Reset bei einheitId-Wechsel.
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

import { useEigenschutzPsaLiveBanner } from '../use-eigenschutz-psa-live-banner';
import { EIGENSCHUTZ_QUERY_KEYS } from '../queries';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const getHandler = (event: string): ((payload?: unknown) => void) | undefined => {
  // Letzte Registrierung pro Event-Name nehmen (Reconnect → mehrere Listener).
  const matches = mockOn.mock.calls.filter(([name]) => name === event);
  return matches.length > 0 ? (matches[matches.length - 1]?.[1] as ((payload?: unknown) => void) | undefined) : undefined;
};

const validPayload = (overrides: Partial<Record<string, unknown>> = {}) => ({
  eventId: 'evt-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  zuweisungId: 'zuw-1',
  propagationGroupId: 'group-1',
  profil: 'CBRN_PATIENT',
  aktion: 'AKTIVIERT',
  userIdHash: 'hash-abc',
  occurredAt: '2026-04-24T10:00:00.000Z',
  ...overrides,
});

describe('useEigenschutzPsaLiveBanner', () => {
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

  it('öffnet Verbindung zum erwarteten Namespace und joint den Einsatz-Room (AC1)', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledWith('https://backend.test/ws/einsatz-events', expect.objectContaining({ transports: ['websocket'], reconnection: false }));

    const connect = getHandler('connect');
    expect(connect).toBeDefined();
    act(() => connect?.());
    expect(mockEmit).toHaveBeenCalledWith('join:einsatz', { einsatzId: 'einsatz-1' });
  });

  it('empfängt valides Event und produziert Banner-Eintrag (AC1, AC2)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });

    act(() => getHandler('connect')?.());
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload()));

    expect(result.current.banner).toHaveLength(1);
    expect(result.current.banner[0]?.propagationGroupId).toBe('group-1');
    expect(result.current.banner[0]?.profilToggles).toHaveLength(1);
    expect(result.current.banner[0]?.profilToggles[0]?.profil).toBe('CBRN_PATIENT');
  });

  it('verwirft malformed Payloads ohne Banner-Mutation und ohne Dedup-Eintrag (AC2)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });
    act(() => getHandler('connect')?.());

    // Erster Frame ist malformed → muss verworfen werden, **eventId darf nicht im LRU landen**.
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.({ eventId: 'evt-bad', foo: 'bar' }));
    expect(result.current.banner).toHaveLength(0);
    expect(loggerMock.warn).toHaveBeenCalled();

    // Zweiter Frame mit gleicher eventId, jetzt valide → muss durchkommen
    // (würde andernfalls vom LRU geblockt, wenn der ungültige Frame eingetragen worden wäre).
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ eventId: 'evt-bad' })));
    expect(result.current.banner).toHaveLength(1);
  });

  it('dedupliziert identische eventId-Frames (AC3)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });
    act(() => getHandler('connect')?.());

    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload()));
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload()));

    expect(result.current.banner).toHaveLength(1);
    expect(result.current.banner[0]?.profilToggles).toHaveLength(1);
  });

  it('filtert Events fremder Einheiten (AC2 — NFR-S5 Defense-in-Depth)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });
    act(() => getHandler('connect')?.());

    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ einheitId: 'fremde-einheit', eventId: 'evt-fremd' })));
    expect(result.current.banner).toHaveLength(0);
  });

  it('aggregiert Events derselben propagationGroupId zu einem Banner (AC5)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });
    act(() => getHandler('connect')?.());

    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ eventId: 'e1', zuweisungId: 'z1', profil: 'CBRN_PATIENT' })));
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ eventId: 'e2', zuweisungId: 'z2', profil: 'VOLLSCHUTZ', occurredAt: '2026-04-24T10:01:00.000Z' })));

    expect(result.current.banner).toHaveLength(1);
    expect(result.current.banner[0]?.profilToggles).toHaveLength(2);
    // Group behält ältesten occurredAt (FIFO-Order, kein Re-Order).
    expect(result.current.banner[0]?.occurredAt).toBe('2026-04-24T10:00:00.000Z');
  });

  it('löscht Banner-State und LRU-Cache bei einheitId-Wechsel (AC3)', () => {
    const client = makeClient();
    const { result, rerender } = renderHook(({ einheitId }: { einheitId: string }) => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId }), {
      wrapper: wrapper(client),
      initialProps: { einheitId: 'einheit-1' },
    });
    act(() => getHandler('connect')?.());
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ eventId: 'evt-pre' })));
    expect(result.current.banner).toHaveLength(1);

    rerender({ einheitId: 'einheit-2' });
    expect(result.current.banner).toHaveLength(0);

    // Nach Wechsel muss eine bisher gesehene eventId wieder durchkommen, da
    // der LRU-Cache geleert wurde — gespiegelter zuweisungId+propagationGroup
    // auf die neue Einheit.
    act(() => getHandler('connect')?.());
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ eventId: 'evt-pre', einheitId: 'einheit-2' })));
    expect(result.current.banner).toHaveLength(1);
  });

  it('invalidiert psaProfileByEinheit-Query auf jedem Event und beim Reconnect (AC4, AC12)', () => {
    const client = makeClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });

    // Connect-Pfad invalidiert (Backfill nach Reconnect).
    act(() => getHandler('connect')?.());
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit('einsatz-1', 'einheit-1') });

    invalidateSpy.mockClear();

    // Event-Pfad invalidiert ebenfalls (für Klartext-Begründung).
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload()));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit('einsatz-1', 'einheit-1') });
  });

  it('plant Reconnect mit Backoff bei disconnect (AC1 — Backoff 1→2→5→10→30 s)', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });

    act(() => getHandler('connect')?.());
    expect(ioMock).toHaveBeenCalledTimes(1);

    act(() => getHandler('disconnect')?.('transport close'));

    // Erster Backoff: 1000 ms — vorher kein Reconnect.
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(ioMock).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

  it('öffnet KEINE Verbindung bei einheitId=null (Story 3.3 AC8 Vorbereitung — keine fremden Einheits-Events fanen)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: null }), { wrapper: wrapper(client) });

    // Hook gating: ohne aktive Einheit darf gar keine WS-Verbindung aufgebaut
    // werden — sonst hält der Hook eine Verbindung offen, deren Events
    // grundsätzlich nicht passen können (Code-Review-Patch Story 3.3).
    expect(ioMock).not.toHaveBeenCalled();
    expect(result.current.status).toBe('disconnected');
  });

  it('verwirft Events fremder Einsätze (NFR-S5 Defense-in-Depth)', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });

    act(() => getHandler('connect')?.());
    // Backend-Bug: Frame mit fremder einsatzId — darf den Banner nicht erreichen.
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload({ einsatzId: 'fremder-einsatz', eventId: 'evt-leak' })));
    expect(result.current.banner).toHaveLength(0);
  });

  it('plant Reconnect nach join:einsatz:error (transienter Auth-/Join-Fehler)', () => {
    const client = makeClient();
    renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });

    expect(ioMock).toHaveBeenCalledTimes(1);
    act(() => getHandler('join:einsatz:error')?.({ message: 'auth-flap' }));
    // Nach 1 s Backoff muss ein Reconnect-Versuch laufen.
    act(() => {
      vi.advanceTimersByTime(1_001);
    });
    expect(ioMock).toHaveBeenCalledTimes(2);
  });

  it('dismiss() entfernt einen Banner-Eintrag aus der Queue', () => {
    const client = makeClient();
    const { result } = renderHook(() => useEigenschutzPsaLiveBanner({ einsatzId: 'einsatz-1', einheitId: 'einheit-1' }), { wrapper: wrapper(client) });
    act(() => getHandler('connect')?.());
    act(() => getHandler('eigenschutz:psa-profil-geaendert')?.(validPayload()));
    expect(result.current.banner).toHaveLength(1);

    act(() => result.current.dismiss('group-1'));
    expect(result.current.banner).toHaveLength(0);
  });
});
