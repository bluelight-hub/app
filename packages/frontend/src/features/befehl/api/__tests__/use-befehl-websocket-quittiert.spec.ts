/**
 * Unit Tests für useBefehlWebSocket - befehl.quittiert Event-Handler
 *
 * Verifiziert den WebSocket quittiert Event-Handler:
 * - Event-Registrierung
 * - Cache-Invalidierung
 * - Deduplizierung
 * - Toast bei fremder vs. eigener Quittierung
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBefehlWebSocket, type BefehlQuittiertPayload } from '../use-befehl-websocket';
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
      find: vi.fn().mockReturnValue(undefined), // No pending mutations by default
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

describe('useBefehlWebSocket - befehl.quittiert Handler', () => {
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
    return mockSocket.on.mock.calls.find((call: [string, (...args: unknown[]) => void]) => call[0] === eventName)?.[1] as ((event: BefehlQuittiertPayload) => void) | undefined;
  };

  it('should register befehl.quittiert event handler', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const registeredEvents = mockSocket.on.mock.calls.map((call: [string, (...args: unknown[]) => void]) => call[0]);
    expect(registeredEvents).toContain('befehl.quittiert');
  });

  it('should invalidate cache on befehl.quittiert event', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.quittiert');
    expect(handler).toBeDefined();

    const event: BefehlQuittiertPayload = {
      befehlId: 'befehl-1',
      einsatzId: 'einsatz-1',
      empfaengerId: 'other-user-id',
      quittierungArt: 'VERSTANDEN',
      quittiertAm: new Date().toISOString(),
    };

    await act(async () => {
      handler!(event);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['befehl', 'list', 'einsatz-1'],
    });
  });

  it('should deduplicate: same event not processed twice', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.quittiert');

    const event: BefehlQuittiertPayload = {
      befehlId: 'befehl-1',
      einsatzId: 'einsatz-1',
      empfaengerId: 'other-user-id',
      quittierungArt: 'VERSTANDEN',
      quittiertAm: '2026-02-18T10:00:00Z',
    };

    // Erstes Mal: sollte verarbeitet werden
    await act(async () => {
      handler!(event);
    });

    // Zweites Mal: gleicher Event sollte dedupliziert werden
    await act(async () => {
      handler!(event);
    });

    // 1 Aufruf pro Event (list invalidiert auch offeneRueckfragen via Prefix-Matching), nur fuer erstes Event
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('should show toast for quittierung by another user', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.quittiert');

    const event: BefehlQuittiertPayload = {
      befehlId: 'befehl-1',
      einsatzId: 'einsatz-1',
      empfaengerId: 'other-user-id', // Nicht der aktuelle User
      quittierungArt: 'VERSTANDEN',
      quittiertAm: new Date().toISOString(),
    };

    await act(async () => {
      handler!(event);
    });

    expect(toast.info).toHaveBeenCalledWith('Befehl quittiert', {
      description: 'Ein Empfänger hat den Befehl quittiert',
    });
  });

  it('should NOT show toast for own quittierung', async () => {
    renderHook(() => useBefehlWebSocket({ einsatzId: 'einsatz-1' }));
    await flushConnectTimer();

    const handler = getEventHandler('befehl.quittiert');

    const event: BefehlQuittiertPayload = {
      befehlId: 'befehl-1',
      einsatzId: 'einsatz-1',
      empfaengerId: 'current-user-id', // Der aktuelle User
      quittierungArt: 'VERSTANDEN',
      quittiertAm: new Date().toISOString(),
    };

    await act(async () => {
      handler!(event);
    });

    // Cache sollte trotzdem invalidiert werden
    expect(mockInvalidateQueries).toHaveBeenCalled();
    // Aber kein Toast
    expect(toast.info).not.toHaveBeenCalled();
  });
});
