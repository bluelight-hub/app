/**
 * useGefahrenzoneWebSocket (Issue #627, G2)
 *
 * Lauscht auf die drei Gefahrenzone-Events vom Backend-`EinsatzEventsGateway`
 * und invalidiert den Query-Cache, sodass `useGefahrenzonen` neu lädt.
 *
 * Konvention der Event-Namen — `ressource:aktion` (vgl. `funkkanal:erstellt`,
 * `etb:eintrag-erstellt`): `gefahrenzone:erstellt`, `gefahrenzone:geometry-geaendert`,
 * `gefahrenzone:geloescht`. Namespace: `/ws/einsatz-events`.
 */

import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { GEFAHRENZONE_QUERY_KEYS } from './queries';

export type GefahrenzoneWebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const GEFAHRENZONE_WS_EVENTS = {
  erstellt: 'gefahrenzone:erstellt',
  geometryGeaendert: 'gefahrenzone:geometry-geaendert',
  geloescht: 'gefahrenzone:geloescht',
} as const;

export interface UseGefahrenzoneWebSocketOptions {
  einsatzId: string;
  enabled?: boolean;
}

export interface UseGefahrenzoneWebSocketReturn {
  status: GefahrenzoneWebSocketStatus;
  isConnected: boolean;
}

const WS_NAMESPACE = '/ws/einsatz-events';
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 10_000;

const getWsUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Abonniert den Einsatz-Room und invalidiert bei jedem der drei
 * Gefahrenzone-Events den Query-Cache. Kein bidirektionaler Send-Pfad —
 * Mutations gehen direkt via REST, Rebroadcast erfolgt server-seitig.
 */
export function useGefahrenzoneWebSocket({ einsatzId, enabled = true }: UseGefahrenzoneWebSocketOptions): UseGefahrenzoneWebSocketReturn {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<GefahrenzoneWebSocketStatus>('disconnected');

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId) });
  }, [queryClient, einsatzId]);

  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  useEffect(() => {
    if (!enabled || !einsatzId) {
      return;
    }

    setStatus('connecting');
    const wsUrl = getWsUrl();
    const socket = io(`${wsUrl}${WS_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY_MS,
      reconnectionDelayMax: RECONNECT_DELAY_MAX_MS,
      reconnectionAttempts: 10,
      withCredentials: true,
    });

    socket.on('connect', () => {
      setStatus('connected');
      socket.emit('join:einsatz', { einsatzId });
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      logger.error('WebSocket: Gefahrenzone Verbindungsfehler', error);
      setStatus('error');
    });

    socket.on(GEFAHRENZONE_WS_EVENTS.erstellt, () => invalidateRef.current());
    socket.on(GEFAHRENZONE_WS_EVENTS.geometryGeaendert, () => invalidateRef.current());
    socket.on(GEFAHRENZONE_WS_EVENTS.geloescht, () => invalidateRef.current());

    socketRef.current = socket;

    return () => {
      if (socket.connected) {
        socket.emit('leave:einsatz', { einsatzId });
      }
      socket.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  }, [enabled, einsatzId]);

  return {
    status,
    isConnected: status === 'connected',
  };
}
