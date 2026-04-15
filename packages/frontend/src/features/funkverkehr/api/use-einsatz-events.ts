/**
 * useEinsatzEvents
 *
 * Abonniert den einsatzgebundenen WebSocket-Namespace `/ws/einsatz-events`
 * und invalidiert passende Query-Caches, wenn Broadcasts eintreffen
 * (ETB-Funksprüche, Funkkanal-Events, Notfall-Alerts).
 *
 * Backoff: 1s → 2s → 5s → 10s → 30s (eigener Retry-Zähler, socket.io
 * auto-reconnect ist deaktiviert, damit wir die Kadenz steuern).
 */

import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { FUNKVERKEHR_QUERY_KEYS } from './queries';

export const EINSATZ_EVENTS_NAMESPACE = '/ws/einsatz-events';

/** Wiederverbindungs-Backoff in Millisekunden. */
export const EINSATZ_EVENTS_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

/** Verbindungs-Status des WebSockets. */
export type EinsatzEventsStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export interface NotfallAlertPayload {
  einsatzId: string;
  kanalId: string;
  kanalName?: string;
  absender?: string;
  empfaenger?: string;
  text: string;
  /** ISO-Timestamp. */
  ereignisZeitpunkt: string;
}

export interface UseEinsatzEventsOptions {
  einsatzId: string;
  enabled?: boolean;
  onNotfall?: (payload: NotfallAlertPayload) => void;
}

export interface UseEinsatzEventsResult {
  status: EinsatzEventsStatus;
  isConnected: boolean;
}

const FUNKKANAL_EVENTS = [
  'funkkanal:erstellt',
  'funkkanal:geaendert',
  'funkkanal:archiviert',
  'funkkanal:reihenfolge-geaendert',
  'funkkanal:zuordnung-erstellt',
  'funkkanal:zuordnung-entfernt',
] as const;

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

export function useEinsatzEvents({ einsatzId, enabled = true, onNotfall }: UseEinsatzEventsOptions): UseEinsatzEventsResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onNotfallRef = useRef(onNotfall);
  const disposedRef = useRef(false);
  const [status, setStatus] = useState<EinsatzEventsStatus>(enabled && einsatzId ? 'connecting' : 'disconnected');

  useEffect(() => {
    onNotfallRef.current = onNotfall;
  });

  const invalidateKanalplan = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.kanalplan(einsatzId) });
  }, [queryClient, einsatzId]);

  const invalidateFunkprotokoll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: FUNKVERKEHR_QUERY_KEYS.funkprotokoll(einsatzId) });
    queryClient.invalidateQueries({ queryKey: ['etb', einsatzId] });
    queryClient.invalidateQueries({ queryKey: ['etb'] });
  }, [queryClient, einsatzId]);

  useEffect(() => {
    if (!enabled || !einsatzId) {
      setStatus('disconnected');
      return;
    }

    disposedRef.current = false;
    const baseUrl = getWsBaseUrl();
    const url = `${baseUrl}${EINSATZ_EVENTS_NAMESPACE}`;

    const scheduleReconnect = () => {
      if (disposedRef.current) return;
      const idx = Math.min(retryIdxRef.current, EINSATZ_EVENTS_BACKOFF_MS.length - 1);
      const delay = EINSATZ_EVENTS_BACKOFF_MS[idx];
      retryIdxRef.current += 1;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (disposedRef.current) return;
        setStatus('reconnecting');
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposedRef.current) return;
      logger.debug?.('[useEinsatzEvents] connecting', { url, einsatzId });

      const socket = io(url, {
        transports: ['websocket'],
        reconnection: false,
        withCredentials: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        retryIdxRef.current = 0;
        setStatus('connected');
        socket.emit('join:einsatz', { einsatzId });
        // Reconnect-Fall: Full-Invalidate, damit verpasste Events nachgezogen werden.
        invalidateKanalplan();
        invalidateFunkprotokoll();
      });

      socket.on('join:einsatz:error', (payload: { message?: string }) => {
        logger.warn?.('[useEinsatzEvents] join:einsatz rejected', payload);
        setStatus('error');
        socket.disconnect();
      });

      socket.on('connect_error', (error) => {
        logger.warn?.('[useEinsatzEvents] connect_error', { message: error?.message });
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEinsatzEvents] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on('etb:eintrag-erstellt', invalidateFunkprotokoll);
      socket.on('etb:eintrag-korrigiert', invalidateFunkprotokoll);

      for (const channel of FUNKKANAL_EVENTS) {
        socket.on(channel, invalidateKanalplan);
      }

      socket.on('funk:notfall-alert', (payload: NotfallAlertPayload) => {
        invalidateFunkprotokoll();
        onNotfallRef.current?.(payload);
      });
    };

    connect();

    return () => {
      disposedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
    };
  }, [einsatzId, enabled, invalidateKanalplan, invalidateFunkprotokoll]);

  return { status, isConnected: status === 'connected' };
}
