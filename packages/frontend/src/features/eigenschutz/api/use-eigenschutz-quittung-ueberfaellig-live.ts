import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { useCurrentUser } from '@/features/auth/api/use-current-user';
import { eigenschutzTelemetryQueue, getOrCreateSessionId } from '../lib/telemetry-queue';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const NAMESPACE = '/ws/einsatz-events';
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const EVENT_ID_CACHE_SIZE = 200;
const NOTICES_CAP = 50;
const CHANNEL = 'eigenschutz:quittung-ueberfaellig';
const CONNECT_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 10;
const RECONNECT_INVALIDATE_COOLDOWN_MS = 5_000;

/**
 * Zod-Schema für den WS-Frame `eigenschutz:quittung-ueberfaellig`
 * (Story 3.7 AC6). 1:1 gespiegelt aus dem Adapter-Vertrag in
 * `quittung-ueberfaellig.adapter.ts`. Diät-Pattern: kein `userId`/
 * `userIdHash` — Auslöser ist `SYSTEM`. Nur IDs + Numerik.
 */
const QuittungUeberfaelligLiveSchema = z.object({
  eventId: z.string().min(1),
  einsatzId: z.string().min(1),
  einheitId: z.string().min(1),
  propagationGroupId: z.string().min(1),
  originalEventId: z.string().min(1),
  ueberfaelligSeitMin: z.number().int().nonnegative(),
  zuweisungId: z.string().nullable(),
  occurredAt: z.string().datetime({ offset: true }),
});

type QuittungUeberfaelligLive = z.infer<typeof QuittungUeberfaelligLiveSchema>;

/**
 * Eintrag im Notice-Buffer — eine bisher nicht dismissed Re-Prompt-Notice.
 */
export interface QuittungUeberfaelligEventNotice {
  readonly propagationGroupId: string;
  readonly einheitId: string;
  readonly ueberfaelligSeitMin: number;
  readonly occurredAt: string;
  readonly zuweisungId: string | null;
}

interface UseEigenschutzQuittungUeberfaelligLiveOptions {
  einsatzId: string;
  enabled?: boolean;
}

export interface UseEigenschutzQuittungUeberfaelligLiveResult {
  /** Aktuell aktive Überfälligkeits-Notices (FIFO, Cap 50). */
  readonly notices: readonly QuittungUeberfaelligEventNotice[];
  readonly status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  /** Lokales Dismiss (kein Backend-Call). */
  readonly dismiss: (propagationGroupId: string, einheitId: string) => void;
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für `eigenschutz:quittung-ueberfaellig` (Story 3.7 AC6).
 *
 * **Verantwortung:**
 * - WS-Subscription auf `/ws/einsatz-events` (`join:einsatz`).
 * - Hört auf den Channel `eigenschutz:quittung-ueberfaellig`.
 * - Validiert Payload via Zod **vor** dem Dedup-Cache.
 * - LRU-Dedup über `eventId`, Größe 200.
 * - Bei validem Frame: Notice anhängen (FIFO, Cap 50), `psaQuittungen` +
 *   `offenePsaBekanntgaben` invalidieren, Telemetrie-Event pushen.
 * - Backoff `1 → 2 → 5 → 10 → 30 s`, sauberer Teardown.
 *
 * **Konsumiert von:**
 * - `PsaProfilEmpfangBanner` (AC7) — `Erneut`-Tag oder synthetischer Banner.
 * - `EinsatzleiterReprompEskalationBanner` (AC8) — `polite`-Mikro-Banner-Stack.
 *
 * **Telemetrie (AC9):** Pro neuer Notice (LRU-Dedup-Pass) genau ein
 * `quittung_ueberfaellig`-Event in die `eigenschutzTelemetryQueue`.
 * Race-Schutz: bei `!user.id` kein Push.
 */
export function useEigenschutzQuittungUeberfaelligLive({ einsatzId, enabled = true }: UseEigenschutzQuittungUeberfaelligLiveOptions): UseEigenschutzQuittungUeberfaelligLiveResult {
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const dismissedKeysRef = useRef<Set<string>>(new Set());
  const lastReconnectInvalidateRef = useRef<number>(0);
  const reconnectIncrementGuardRef = useRef(false);
  const [notices, setNotices] = useState<QuittungUeberfaelligEventNotice[]>([]);
  const [status, setStatus] = useState<UseEigenschutzQuittungUeberfaelligLiveResult['status']>(enabled && einsatzId ? 'connecting' : 'disconnected');

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

  // einsatzId-Wechsel löscht Dedup-LRU + Notices + Dismissed-Set.
  useEffect(() => {
    eventIdCacheRef.current = new Set();
    eventIdOrderRef.current = [];
    dismissedKeysRef.current = new Set();
    setNotices([]);
  }, [einsatzId]);

  const dismiss = useCallback((propagationGroupId: string, einheitId: string) => {
    dismissedKeysRef.current.add(`${propagationGroupId}:${einheitId}`);
    setNotices((prev) => prev.filter((n) => !(n.propagationGroupId === propagationGroupId && n.einheitId === einheitId)));
  }, []);

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
      // Doppel-Increment-Guard: socket.io feuert sowohl `connect_error` als
      // auch `disconnect` für ein einzelnes Connection-Failure. Ohne Guard
      // würde der Retry-Counter pro Failure 2× hochzählen — MAX_RETRIES=10
      // würde de-facto bei ~5 erreicht. Der Guard wird bei `connect`
      // (success) und im Retry-Timer-Callback zurückgesetzt.
      if (reconnectIncrementGuardRef.current) {
        return;
      }
      reconnectIncrementGuardRef.current = true;

      if (retryIdxRef.current >= MAX_RETRIES) {
        logger.warn?.('[useEigenschutzQuittungUeberfaelligLive] retry-cap erreicht', { retries: retryIdxRef.current });
        setStatus('error');
        return;
      }
      const idx = Math.min(retryIdxRef.current, BACKOFF_MS.length - 1);
      const delay = BACKOFF_MS[idx];
      retryIdxRef.current += 1;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        if (disposedRef.current) return;
        reconnectIncrementGuardRef.current = false;
        setStatus('reconnecting');
        connect();
      }, delay);
    };

    const handlePayload = (payload: QuittungUeberfaelligLive) => {
      if (disposedRef.current) return;

      const key = `${payload.propagationGroupId}:${payload.einheitId}`;
      // P1 — Revive-Semantik (AC7 Step 4): Eintreffen einer neuen Reprompt-
      // Notice für eine zuvor dismissed Group/Einheit muss den Banner wieder
      // sichtbar machen. Vor dem Patch hielt `dismissedKeysRef` den Key
      // dauerhaft und unterdrückte alle weiteren Reprompts der Session.
      if (dismissedKeysRef.current.has(key)) {
        dismissedKeysRef.current.delete(key);
      }
      {
        setNotices((prev) => {
          const filtered = prev.filter((n) => !(n.propagationGroupId === payload.propagationGroupId && n.einheitId === payload.einheitId));
          const next = [
            ...filtered,
            {
              propagationGroupId: payload.propagationGroupId,
              einheitId: payload.einheitId,
              ueberfaelligSeitMin: payload.ueberfaelligSeitMin,
              occurredAt: payload.occurredAt,
              zuweisungId: payload.zuweisungId,
            },
          ];
          return next.length > NOTICES_CAP ? next.slice(next.length - NOTICES_CAP) : next;
        });
      }

      void queryClient.invalidateQueries({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.psaQuittungen(einsatzId, payload.propagationGroupId),
      });
      void queryClient.invalidateQueries({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(einsatzId),
      });

      // Telemetrie (AC9) — Race-Schutz: bei !user.id kein Push.
      if (user?.id) {
        try {
          eigenschutzTelemetryQueue.push({
            eventName: 'quittung_ueberfaellig',
            propagationGroupIdCandidate: payload.propagationGroupId,
            abschnittCount: 1,
            userId: user.id,
            sessionId: getOrCreateSessionId(),
            clientTime: new Date().toISOString(),
            metadata: {
              einheitIdCandidate: payload.einheitId,
              ueberfaelligSeitMin: payload.ueberfaelligSeitMin,
              originalEventIdCandidate: payload.originalEventId,
            },
          });
        } catch (err) {
          logger.warn?.('[useEigenschutzQuittungUeberfaelligLive] Telemetrie-Push fehlgeschlagen', { err });
        }
      }
    };

    const invalidateAfterReconnect = () => {
      // P15 — Cooldown-Guard gegen flappy WS: ohne diesen lief bei
      // Connect/Disconnect-Storms pro Sekunde ein Cache-Invalidate, was zu
      // Refetch-Thundering-Herd führt. 5-s-Cooldown ist konservativ — die
      // erste Reconnect-Invalidation gewinnt, nachfolgende werden als
      // redundant verworfen. Bei einsatzId-Wechsel feuert der Cleanup-Effekt
      // sowieso eigene Invalidations.
      const now = Date.now();
      if (now - lastReconnectInvalidateRef.current < RECONNECT_INVALIDATE_COOLDOWN_MS) {
        return;
      }
      lastReconnectInvalidateRef.current = now;
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(einsatzId) });
    };

    const connect = () => {
      if (disposedRef.current) return;
      teardownSocket();

      logger.debug?.('[useEigenschutzQuittungUeberfaelligLive] connecting', { url, einsatzId });

      const socket = io(url, {
        transports: ['websocket'],
        reconnection: false,
        withCredentials: true,
        timeout: CONNECT_TIMEOUT_MS,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        retryIdxRef.current = 0;
        reconnectIncrementGuardRef.current = false;
        setStatus('connected');
        socket.emit('join:einsatz', { einsatzId });
        invalidateAfterReconnect();
      });

      socket.on('connect_error', (error: Error) => {
        logger.warn?.('[useEigenschutzQuittungUeberfaelligLive] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (errorPayload: { message?: string }) => {
        logger.warn?.('[useEigenschutzQuittungUeberfaelligLive] join rejected', errorPayload);
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEigenschutzQuittungUeberfaelligLive] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on(CHANNEL, (rawPayload: unknown) => {
        const parsed = QuittungUeberfaelligLiveSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useEigenschutzQuittungUeberfaelligLive] verworfen — ungültiger Payload', {
            issues: parsed.error.issues,
          });
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
      reconnectIncrementGuardRef.current = false;
      retryIdxRef.current = 0;
      lastReconnectInvalidateRef.current = 0;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      teardownSocket();
      // P13 — Stale-Notices vermeiden: bei `enabled=false`-Toggle würden alte
      // Banner sonst kurz sichtbar bleiben, bis der nächste Cache-Invalidate
      // sie überschreibt.
      setNotices([]);
      setStatus('disconnected');
    };
  }, [einsatzId, enabled, dedupAdd, queryClient, user?.id]);

  return { notices, status, dismiss };
}
