import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

// Mock socket.io-client
const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockSocket = {
  on: mockOn,
  emit: mockEmit,
  disconnect: mockDisconnect,
  connected: false,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('../../services/notification.service', () => ({
  sendAssignmentNotification: vi.fn(),
}));

import { ERINNERUNG_QUERY_KEYS } from '../../api/queries';
import { useErinnerungWebSocket } from '../use-erinnerung-websocket';

describe('useErinnerungWebSocket - Cache-Invalidierung', () => {
  let queryClient: QueryClient;

  function createWrapper() {
    return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');

    // Reset mock socket
    mockSocket.connected = false;
    mockOn.mockReset();
    mockEmit.mockReset();
    mockDisconnect.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Hilfsfunktion: Sucht den registrierten Handler fuer ein Event
   */
  function getEventHandler(eventName: string) {
    const call = mockOn.mock.calls.find(([name]: [string]) => name === eventName);
    return call?.[1] as ((...args: unknown[]) => void) | undefined;
  }

  it('invalidateStatistikCache invalidiert alle 5 Query-Keys', () => {
    // Given
    const einsatzId = 'einsatz-1';
    renderHook(() => useErinnerungWebSocket({ einsatzId }), {
      wrapper: createWrapper(),
    });

    // Simuliere connect und ein Event das debouncedInvalidateStatistik aufruft
    const connectHandler = getEventHandler('connect');
    act(() => {
      mockSocket.connected = true;
      connectHandler?.();
    });

    const createdHandler = getEventHandler('erinnerung.created');
    act(() => {
      createdHandler?.({
        erinnerungId: 'e-1',
        einsatzId,
        timestamp: new Date().toISOString(),
        userId: 'other-user',
      });
    });

    // Debounce-Timer ablaufen lassen (500ms)
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Then: Alle 5 Statistik-Query-Keys muessen invalidiert werden
    const invalidateCalls = vi.mocked(queryClient.invalidateQueries).mock.calls;
    const invalidatedKeys = invalidateCalls.map((call) => call[0]?.queryKey);

    expect(invalidatedKeys).toContainEqual(ERINNERUNG_QUERY_KEYS.statistik(einsatzId));
    expect(invalidatedKeys).toContainEqual(ERINNERUNG_QUERY_KEYS.personStatistik(einsatzId));
    expect(invalidatedKeys).toContainEqual(ERINNERUNG_QUERY_KEYS.zeitverlauf(einsatzId));
    expect(invalidatedKeys).toContainEqual(ERINNERUNG_QUERY_KEYS.eskalationsAnalyse(einsatzId));
    expect(invalidatedKeys).toContainEqual(ERINNERUNG_QUERY_KEYS.reaktionszeit(einsatzId));
    expect(invalidatedKeys).toContainEqual(ERINNERUNG_QUERY_KEYS.fuehrungsrhythmus(einsatzId));
  });

  it('debouncedInvalidateStatistik: Bei Burst-Events wird nur 1x invalidiert', () => {
    // Given
    const einsatzId = 'einsatz-2';
    renderHook(() => useErinnerungWebSocket({ einsatzId }), {
      wrapper: createWrapper(),
    });

    const connectHandler = getEventHandler('connect');
    act(() => {
      mockSocket.connected = true;
      connectHandler?.();
    });

    const updatedHandler = getEventHandler('erinnerung.updated');
    const baseEvent = { erinnerungId: 'e-1', einsatzId, timestamp: new Date().toISOString() };

    // When: 3 Events in schneller Folge (<100ms)
    act(() => {
      updatedHandler?.(baseEvent);
    });
    act(() => {
      vi.advanceTimersByTime(50);
      updatedHandler?.(baseEvent);
    });
    act(() => {
      vi.advanceTimersByTime(50);
      updatedHandler?.(baseEvent);
    });

    // Vor Debounce ablauf: Statistik-Invalidierung sollte noch NICHT passiert sein
    // (Liste wird sofort invalidiert, aber Statistik ist debounced)
    const callsBeforeDebounce = vi.mocked(queryClient.invalidateQueries).mock.calls.filter((call) => {
      const key = call[0]?.queryKey;
      return Array.isArray(key) && key.includes('statistik');
    });
    expect(callsBeforeDebounce).toHaveLength(0);

    // Timer ablaufen lassen
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Then: Genau 1 Batch von 5 Statistik-Invalidierungen
    const statistikCalls = vi.mocked(queryClient.invalidateQueries).mock.calls.filter((call) => {
      const key = call[0]?.queryKey;
      return (
        Array.isArray(key) && (key.includes('statistik') || key.includes('person-statistik') || key.includes('zeitverlauf') || key.includes('eskalations-analyse') || key.includes('reaktionszeit'))
      );
    });
    // 5 Query-Keys, 1x aufgerufen = 5 Calls
    expect(statistikCalls).toHaveLength(5);
  });

  it('Debounce-Timer wird bei Unmount aufgeraeumt (kein Memory Leak)', () => {
    // Given
    const einsatzId = 'einsatz-3';
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() => useErinnerungWebSocket({ einsatzId }), {
      wrapper: createWrapper(),
    });

    const connectHandler = getEventHandler('connect');
    act(() => {
      mockSocket.connected = true;
      connectHandler?.();
    });

    // Event triggern (startet Debounce-Timer)
    const createdHandler = getEventHandler('erinnerung.created');
    act(() => {
      createdHandler?.({
        erinnerungId: 'e-1',
        einsatzId,
        timestamp: new Date().toISOString(),
        userId: 'other-user',
      });
    });

    // When: Unmount bevor Debounce-Timer ablaeuft
    unmount();

    // Then: clearTimeout wurde aufgerufen (Cleanup im useEffect return)
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('erinnerung.created Handler ruft debouncedInvalidateStatistik auf', () => {
    // Given
    const einsatzId = 'einsatz-4';
    renderHook(() => useErinnerungWebSocket({ einsatzId }), {
      wrapper: createWrapper(),
    });

    const connectHandler = getEventHandler('connect');
    act(() => {
      mockSocket.connected = true;
      connectHandler?.();
    });

    const createdHandler = getEventHandler('erinnerung.created');

    // When
    act(() => {
      createdHandler?.({
        erinnerungId: 'e-1',
        einsatzId,
        titel: 'Test-Erinnerung',
        timestamp: new Date().toISOString(),
        userId: 'other-user',
      });
    });

    // Then: Listen-Cache sofort invalidiert
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ERINNERUNG_QUERY_KEYS.list(einsatzId),
    });

    // Debounce ablaufen lassen
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Statistik-Cache wird nach Debounce invalidiert
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ERINNERUNG_QUERY_KEYS.statistik(einsatzId),
    });
  });
});
