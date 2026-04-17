/**
 * useGefahrenmatrixWebSocket (Issue #627, G4)
 *
 * Abonniert `gefahrenmatrix:aktualisiert` im Namespace `/ws/einsatz-events`
 * (wie `useGefahrenzoneWebSocket`). Invalidiert den Matrix-Query-Cache und
 * meldet AKUT-Events an den `akutBroadcastStore`, damit `AkutBroadcastToast`
 * die dreistufige Eskalation rendern kann.
 *
 * Filter: eigene Broadcasts (d. h. `aktualisiertVon === currentUserId`) werden
 * nicht als Alert ausgelöst — „niemand erschreckt sich vor der eigenen
 * Handlung" (UX-Spec).
 */

import { getBaseUrl } from '@/shared/api/client';
import { logger } from '@/shared/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { GEFAHRENMATRIX_QUERY_KEYS } from './queries';
import { akutBroadcastActions, playAkutBeep } from '../stores/akut-broadcast.store';
import type { GefahrentypValue, SchutzobjektValue, WarnstufeValue } from '../schemas/gefahrenmatrix.schema';

const WS_NAMESPACE = '/ws/einsatz-events';
const RECONNECT_DELAY_MS = 1000;
const RECONNECT_DELAY_MAX_MS = 10_000;

export type GefahrenmatrixWebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GefahrenmatrixAktualisiertPayload {
  einsatzId: string;
  gefahrentyp: GefahrentypValue;
  schutzobjekt: SchutzobjektValue;
  warnstufe: WarnstufeValue;
  aktualisiertVon: string;
}

export interface UseGefahrenmatrixWebSocketOptions {
  einsatzId: string;
  /** Aktuelle User-ID fürs Self-Filter (keine AKUT-Toasts für eigene Broadcasts). */
  currentUserId?: string | null;
  enabled?: boolean;
}

export interface UseGefahrenmatrixWebSocketReturn {
  status: GefahrenmatrixWebSocketStatus;
  isConnected: boolean;
}

const getWsUrl = (): string => getBaseUrl() || 'http://localhost:3091';

export function useGefahrenmatrixWebSocket({ einsatzId, currentUserId, enabled = true }: UseGefahrenmatrixWebSocketOptions): UseGefahrenmatrixWebSocketReturn {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<GefahrenmatrixWebSocketStatus>('disconnected');

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: GEFAHRENMATRIX_QUERY_KEYS.byEinsatz(einsatzId) });
  }, [queryClient, einsatzId]);

  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;
  const userIdRef = useRef(currentUserId);
  userIdRef.current = currentUserId;

  useEffect(() => {
    if (!enabled || !einsatzId) return;

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

    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', (error) => {
      logger.error('WebSocket: Gefahrenmatrix Verbindungsfehler', error);
      setStatus('error');
    });

    socket.on('gefahrenmatrix:aktualisiert', (payload: GefahrenmatrixAktualisiertPayload) => {
      invalidateRef.current();
      if (payload?.warnstufe !== 'AKUT') return;
      if (payload.aktualisiertVon && userIdRef.current && payload.aktualisiertVon === userIdRef.current) return;

      const id = `${payload.einsatzId}:${payload.gefahrentyp}:${payload.schutzobjekt}:${Date.now()}`;
      akutBroadcastActions.pushAlert({
        id,
        einsatzId: payload.einsatzId,
        gefahrentyp: payload.gefahrentyp,
        schutzobjekt: payload.schutzobjekt,
        aktualisiertVon: payload.aktualisiertVon,
      });
      playAkutBeep();
    });

    socketRef.current = socket;

    return () => {
      if (socket.connected) socket.emit('leave:einsatz', { einsatzId });
      socket.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  }, [enabled, einsatzId]);

  return { status, isConnected: status === 'connected' };
}
