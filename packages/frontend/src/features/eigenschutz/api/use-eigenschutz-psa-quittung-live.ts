import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const NAMESPACE = '/ws/einsatz-events';

/** Wiederverbindungs-Backoff in Millisekunden (Story 2.7-Pattern). */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

/** LRU-Cache-Größe für Event-Dedup (Story 3.4 AC11 — analog Story 3.3). */
const EVENT_ID_CACHE_SIZE = 200;

/** WS-Channel-Name aus dem Backend-Adapter (`psa-quittung-abgegeben.adapter.ts`). */
const CHANNEL = 'eigenschutz:psa-quittung-abgegeben';

/** socket.io-Connect-Timeout (ms). Schützt vor stuck-`connecting`. */
const CONNECT_TIMEOUT_MS = 5_000;

/** Cap für eigenständige Reconnect-Versuche. */
const MAX_RETRIES = 10;

/**
 * Zod-Schema für den WS-Frame `eigenschutz:psa-quittung-abgegeben`
 * (Story 3.4 AC11). 1:1 gespiegelt aus dem Adapter-Vertrag in
 * `psa-quittung-abgegeben.adapter.ts`. PII-Diät: nur `userIdHash` (kein
 * Klartext-`userId`); Klartext-Name lädt der Sender-View per REST-Refetch.
 */
const PsaQuittungAbgegebenLiveSchema = z.object({
  eventId: z.string().min(1),
  einsatzId: z.string().min(1),
  einheitId: z.string().min(1),
  propagationGroupId: z.string().min(1),
  userIdHash: z.string().min(1),
  // ISO-DateTime statt freiem String — fängt Backend-Bugs auf, die einen
  // invaliden Timestamp emittieren, bevor wir auf Junk-Daten Cache-
  // Invalidierungen auslösen.
  quittiertAm: z.string().datetime({ offset: true }),
  occurredAt: z.string().datetime({ offset: true }),
});

type PsaQuittungAbgegebenLive = z.infer<typeof PsaQuittungAbgegebenLiveSchema>;

interface UseEigenschutzPsaQuittungLiveOptions {
  einsatzId: string;
  enabled?: boolean;
}

interface UseEigenschutzPsaQuittungLiveResult {
  /** WS-Verbindungs-Status. */
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für `eigenschutz:psa-quittung-abgegeben` (Story 3.4 AC11).
 *
 * **Verantwortung — rein Cache-Invalidator:**
 * - WS-Subscription auf `/ws/einsatz-events` (`join:einsatz`).
 * - Hört auf den Channel `eigenschutz:psa-quittung-abgegeben`.
 * - Validiert Payload via Zod **vor** dem Dedup-Cache (Story 2.7-Pattern).
 * - LRU-Dedup über `eventId`, Größe 200.
 * - Bei validem Frame: invalidiert `psaQuittungen(einsatzId, propagationGroupId)`
 *   UND `offenePsaBekanntgaben(einsatzId)` — REST-Refetch ist authoritative.
 * - Backoff `1 → 2 → 5 → 10 → 30 s`, sauberer Teardown vor jedem `connect()`.
 *
 * **Kein Banner für den Sender** — der Hook ist Cache-Invalidator only.
 *
 * **Begründung NICHT aus WS:** Architektur §B5 — Klartext-User-Name kommt
 * aus dem REST-Refetch (`useEigenschutzPsaQuittungen`).
 */
export function useEigenschutzPsaQuittungLive({ einsatzId, enabled = true }: UseEigenschutzPsaQuittungLiveOptions): UseEigenschutzPsaQuittungLiveResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const [status, setStatus] = useState<UseEigenschutzPsaQuittungLiveResult['status']>(enabled && einsatzId ? 'connecting' : 'disconnected');

  const dedupAdd = useCallback((eventId: string): boolean => {
    if (eventIdCacheRef.current.has(eventId)) return false;
    eventIdCacheRef.current.add(eventId);
    eventIdOrderRef.current.push(eventId);
    if (eventIdOrderRef.current.length > EVENT_ID_CACHE_SIZE) {
      const evict = eventIdOrderRef.current.shift();
      if (evict !== undefined) eventIdCacheRef.current.delete(evict);
    }
    return true;
  }, []);

  // einsatzId-Wechsel löscht Dedup-LRU (Defense-in-Depth gegen Stale-Events).
  useEffect(() => {
    eventIdCacheRef.current = new Set();
    eventIdOrderRef.current = [];
  }, [einsatzId]);

  useEffect(() => {
    if (!enabled || !einsatzId) {
      setStatus('disconnected');
      return;
    }

    disposedRef.current = false;
    const baseUrl = getWsBaseUrl();
    const url = `${baseUrl}${NAMESPACE}`;

    const teardownSocket = () => {
      const previous = socketRef.current;
      if (previous) {
        previous.removeAllListeners();
        previous.disconnect();
      }
      socketRef.current = null;
    };

    const scheduleReconnect = () => {
      if (disposedRef.current) return;
      if (retryIdxRef.current >= MAX_RETRIES) {
        logger.warn?.('[useEigenschutzPsaQuittungLive] retry-cap erreicht — User-Action erforderlich', { retries: retryIdxRef.current });
        setStatus('error');
        return;
      }
      const idx = Math.min(retryIdxRef.current, BACKOFF_MS.length - 1);
      const delay = BACKOFF_MS[idx];
      retryIdxRef.current += 1;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (disposedRef.current) return;
        setStatus('reconnecting');
        connect();
      }, delay);
    };

    const handlePayload = (payload: PsaQuittungAbgegebenLive) => {
      if (disposedRef.current) return;
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaQuittungen(einsatzId, payload.propagationGroupId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelWarnBadges(einsatzId) });
    };

    const invalidateAfterReconnect = () => {
      // Nach Reconnect: Backfill verpasster Quittungen via Listen-Refetch.
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelWarnBadges(einsatzId) });
    };

    const connect = () => {
      if (disposedRef.current) return;
      teardownSocket();

      logger.debug?.('[useEigenschutzPsaQuittungLive] connecting', { url, einsatzId });

      const socket = io(url, {
        transports: ['websocket'],
        reconnection: false,
        withCredentials: true,
        timeout: CONNECT_TIMEOUT_MS,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        retryIdxRef.current = 0;
        setStatus('connected');
        socket.emit('join:einsatz', { einsatzId });
        invalidateAfterReconnect();
      });

      socket.on('connect_error', (error: Error) => {
        logger.warn?.('[useEigenschutzPsaQuittungLive] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (errorPayload: { message?: string }) => {
        logger.warn?.('[useEigenschutzPsaQuittungLive] join rejected', errorPayload);
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEigenschutzPsaQuittungLive] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on(CHANNEL, (rawPayload: unknown) => {
        const parsed = PsaQuittungAbgegebenLiveSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useEigenschutzPsaQuittungLive] verworfen — ungültiger Payload', { issues: parsed.error.issues });
          return;
        }
        const payload = parsed.data;
        if (payload.einsatzId !== einsatzId) return;
        if (!dedupAdd(payload.eventId)) return;
        handlePayload(payload);
      });
    };

    connect();

    return () => {
      disposedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      teardownSocket();
      setStatus('disconnected');
    };
  }, [einsatzId, enabled, dedupAdd, queryClient]);

  return { status };
}
