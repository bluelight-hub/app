/**
 * Unit Tests für useBefehlWebSocket - befehl.kommentarHinzugefuegt Event-Handler
 *
 * Verifiziert den WebSocket kommentarHinzugefuegt Event-Handler:
 * - Event-Registrierung
 * - Cache-Invalidierung
 * - Deduplizierung
 * - Toast bei Rückfragen von anderen Usern
 * - Kein Toast bei eigenen Kommentaren
 * - Kein Toast bei normalen Kommentaren (nur Rückfragen)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBefehlWebSocket, type BefehlKommentarHinzugefuegtPayload } from '../use-befehl-websocket';
import { toast } from 'sonner';

// Mock dependencies
const mockInvalidateQueries = vi.fn();

const { mockSocket, mockIo } = vi.hoisted(() => {
  const socket = {
    connected: false,
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  };
  return {
    mockSocket: socket,
    mockIo: vi.fn(() => socket),
  };
});

vi.mock('socket.io-client', () => ({
  io: mockIo,
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
    getMutationCache: () => ({
      find: vi.fn().mockReturnValue(undefined),
    }),
  }),
  QueryClient: class {
    getQueryCache() {
      return { subscribe: vi.fn() };
    }
    getMutationCache() {
      return { subscribe: vi.fn() };
    }
    setDefaultOptions() {}
  },
  QueryCache: class {
    subscribe() {}
  },
  MutationCache: class {
    subscribe() {}
  },
}));

vi.mock('@/features/auth/api', () => ({
  useCurrentUser: () => ({
    user: { id: 'current-user-id', name: 'Current User' },
  }),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/api/client', () => ({
  getBaseUrl: () => 'http://localhost:3091',
}));

describe('useBefehlWebSocket - befehl.kommentarHinzugefuegt Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockImplementation((event: string, callback: (...args: unknown[]) => void) => {
      if (event === 'connect') {
        mockSocket.connected = true;
        callback();
      }
    });
  });

  /** Flusht den setTimeout(fn, 0) aus dem useEffect Auto-Connect */
  const flushConnectTimer = async () => {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  };

  /** Holt den Handler für ein bestimmtes Event */
  const getEventHandler = (eventName: string) => {
    return mockSocket.on.mock.calls.find((call: [string, (...args: unknown[]) => void]) => call[0] === eventName)?.[1] as ((event: BefehlKommentarHinzugefuegtPayload) => void) | undefined;
  };

  it('should register befehl.kommentarHinzugefuegt event handler', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const registeredEvents = mockSocket.on.mock.calls.map((call: [string, (...args: unknown[]) => void]) => call[0]);
    expect(registeredEvents).toContain('befehl.kommentarHinzugefuegt');
  });

  it('should invalidate cache on kommentar event', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');
    expect(handler).toBeDefined();

    const event: BefehlKommentarHinzugefuegtPayload = {
      eventId: 'evt-1',
      befehlId: 'befehl-1',
      kommentarId: 'kommentar-1',
      authorId: 'other-user-id',
      text: 'Test Kommentar',
      isRueckfrage: false,
    };

    await act(async () => {
      handler?.(event);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['befehl', 'list', 'einsatz-1'],
    });
  });

  it('should deduplicate: same event not processed twice', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');

    const event: BefehlKommentarHinzugefuegtPayload = {
      eventId: 'evt-1',
      befehlId: 'befehl-1',
      kommentarId: 'kommentar-1',
      authorId: 'other-user-id',
      text: 'Test Kommentar',
      isRueckfrage: true,
    };

    await act(async () => {
      handler?.(event);
    });

    await act(async () => {
      handler?.(event);
    });

    // 1 Aufruf pro Event (list invalidiert auch offeneRueckfragen via Prefix-Matching), nur fuer erstes Event
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should show toast for Rueckfrage from another user', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');

    const event: BefehlKommentarHinzugefuegtPayload = {
      eventId: 'evt-1',
      befehlId: 'befehl-1',
      kommentarId: 'kommentar-1',
      authorId: 'other-user-id',
      text: 'Was genau ist gemeint?',
      isRueckfrage: true,
    };

    await act(async () => {
      handler?.(event);
    });

    expect(toast.info).toHaveBeenCalledWith('Neue Rückfrage', {
      description: 'Was genau ist gemeint?',
    });
  });

  it('should NOT show toast for own Rueckfrage', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');

    const event: BefehlKommentarHinzugefuegtPayload = {
      eventId: 'evt-1',
      befehlId: 'befehl-1',
      kommentarId: 'kommentar-1',
      authorId: 'current-user-id',
      text: 'Meine eigene Rückfrage',
      isRueckfrage: true,
    };

    await act(async () => {
      handler?.(event);
    });

    // Cache invalidierung JA
    expect(mockInvalidateQueries).toHaveBeenCalled();
    // Toast NEIN (eigener Kommentar)
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('should NOT show toast for normal Kommentar (not Rueckfrage)', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');

    const event: BefehlKommentarHinzugefuegtPayload = {
      eventId: 'evt-1',
      befehlId: 'befehl-1',
      kommentarId: 'kommentar-1',
      authorId: 'other-user-id',
      text: 'Normaler Kommentar',
      isRueckfrage: false,
    };

    await act(async () => {
      handler?.(event);
    });

    // Cache invalidierung JA
    expect(mockInvalidateQueries).toHaveBeenCalled();
    // Toast NEIN (keine Rückfrage)
    expect(toast.info).not.toHaveBeenCalled();
  });

  it('should call onKommentarHinzugefuegt callback', async () => {
    const onKommentarHinzugefuegt = vi.fn();

    renderHook(() =>
      useBefehlWebSocket({
        einsatzId: 'einsatz-1',
        onKommentarHinzugefuegt,
      }),
    );
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');

    const event: BefehlKommentarHinzugefuegtPayload = {
      eventId: 'evt-1',
      befehlId: 'befehl-1',
      kommentarId: 'kommentar-1',
      authorId: 'other-user-id',
      text: 'Test',
      isRueckfrage: false,
    };

    await act(async () => {
      handler?.(event);
    });

    expect(onKommentarHinzugefuegt).toHaveBeenCalledWith(event);
  });

  it('should reject invalid payload', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.kommentarHinzugefuegt');

    await act(async () => {
      handler?.({ befehlId: '', kommentarId: '' } as BefehlKommentarHinzugefuegtPayload);
    });

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
