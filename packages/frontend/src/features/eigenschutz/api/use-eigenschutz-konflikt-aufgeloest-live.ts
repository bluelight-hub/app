import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';

const NAMESPACE = '/ws/einsatz-events';
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const EVENT_ID_CACHE_SIZE = 200;
const CHANNEL = 'eigenschutz:konflikt-aufgeloest';
const CONNECT_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 10;

/**
 * Zod-Schema für den WS-Frame `eigenschutz:konflikt-aufgeloest`
 * (Story 3.10 AC6, gespiegelt aus dem Backend-Adapter).
 *
 * **Inline-Schema (kein Shared-Import):** Backend ESM/CJS-Interop führt aktuell
 * dazu, dass Schemas aus `@bluelight-hub/shared` im Frontend nicht ohne
 * Build-Anpassung konsumierbar sind (gleicher Pattern wie Story 3.9 AC8).
 *
 * **PII-Vertrag:** der Frame trägt keinen `localPayload` — der volle
 * Verlierer-State lebt nur in `sync_conflicts`-Row + Outbox-Event.
 */
export const KonfliktAufgeloestLiveSchema = z
  .object({
    eventId: z.string().min(1),
    einsatzId: z.string().min(1),
    einheitId: z.string().nullable(),
    syncConflictId: z.string().min(1),
    entityType: z.enum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM']),
    entityId: z.string().min(1),
    fieldPath: z.string().max(200),
    resolution: z.enum(['SERVER_WINS', 'LOCAL_WINS', 'MERGED']),
    resolvedAt: z.string().datetime({ offset: true }),
    resolvedByUserId: z.string().min(1),
  })
  .strict();

export type KonfliktAufgeloestLive = z.infer<typeof KonfliktAufgeloestLiveSchema>;

interface UseEigenschutzKonfliktAufgeloestLiveOptions {
  einsatzId: string;
  enabled?: boolean;
}

interface UseEigenschutzKonfliktAufgeloestLiveResult {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für `eigenschutz:konflikt-aufgeloest` (Story 3.10 AC7).
 *
 * **Verantwortung:**
 * - WS-Subscription auf `/ws/einsatz-events` mit `join:einsatz`.
 * - Validiert Payload via Zod **vor** Dedup-Cache (Story 2.7-Pattern).
 * - LRU-Dedup über `eventId`, Größe 200.
 * - Bei validem Frame: invalidiert
 *   - `['eigenschutz', einsatzId, 'sync-conflicts']` — der aufgelöste Konflikt
 *     verschwindet aus der Liste (alle Filter-Varianten dank gemeinsamem
 *     Prefix).
 *   - `['eigenschutz', einsatzId, 'psa-profile']` — bei `LOCAL_WINS` hat sich
 *     der Server-State verschoben; bei `SERVER_WINS`/`MERGED` ist die
 *     Invalidation defensiv (PSA-Cache ist klein, Refetch günstig). AC7-§5
 *     impliziert always-invalidate-both.
 *
 * **Kein UI-State:** der Hook rendert keinen Banner. Der Mikro-Banner
 * aus Story 3.9 (`KonfliktErkanntMikroBanner`) verschwindet nach 30 s
 * Auto-Dismiss; eine sofortige Cross-Hook-Dismiss würde den Story-3.9-
 * `KonfliktErkanntLiveSchema` um `syncConflictId` als Korrelator erweitern
 * müssen (das `eventId` der beiden Frames ist unterschiedlich) — ist als
 * separater Schema-Bump aufgeschoben.
 *
 * **PII-Vertrag im Logger:** `logger.info`/`debug`-Calls tragen **keine**
 * vollen IDs; nur stabile Konstanten + Hook-Name. Ein dezidierter
 * `redactId`-Helper existiert im Frontend (Stand 04/2026) noch nicht;
 * Pattern Story 3.9 (`useEigenschutzKonfliktErkanntLive`).
 *
 * **Schema-Drift-Fallback:** bei ungültigem Payload wird `console.warn`
 * (über `logger.warn`) gerufen und die Invalidierung übersprungen — kein
 * Throw, kein UI-Bruch.
 */
export function useEigenschutzKonfliktAufgeloestLive({ einsatzId, enabled = true }: UseEigenschutzKonfliktAufgeloestLiveOptions): UseEigenschutzKonfliktAufgeloestLiveResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const [status, setStatus] = useState<UseEigenschutzKonfliktAufgeloestLiveResult['status']>(enabled && einsatzId ? 'connecting' : 'disconnected');

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
        logger.warn?.('[useEigenschutzKonfliktAufgeloestLive] retry-cap erreicht', { retries: retryIdxRef.current });
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

    const handlePayload = (_payload: KonfliktAufgeloestLive) => {
      if (disposedRef.current) return;
      // AC7 §4 + Advisor-Note: always-invalidate-both.
      // Liste-Cache: der aufgelöste Konflikt verschwindet aus allen Filter-
      // Varianten (gemeinsames Prefix `[..., 'sync-conflicts']`).
      void queryClient.invalidateQueries({ queryKey: ['eigenschutz', einsatzId, 'sync-conflicts'] });
      // PSA-Profil-Cache: bei `LOCAL_WINS` hat sich der Server-State
      // verschoben (Re-Apply der Verlierer-Mutation). Bei den anderen
      // Resolutions ist die Invalidierung defensiv (PSA-Cache ist klein,
      // Refetch günstig). AC7 §5 impliziert always-both.
      void queryClient.invalidateQueries({ queryKey: ['eigenschutz', einsatzId, 'psa-profile'] });
    };

    const connect = () => {
      if (disposedRef.current) return;
      teardownSocket();

      // PII-Vertrag (Story 3.10 AC7): IDs landen NICHT im logger.debug —
      // bewusst nur `url` als stabile Konstante. Pattern weicht hier
      // (besser-als-Story-3.9-Sibling) absichtlich vom 3.9-Hook ab; der
      // entsprechende PII-Test in der Spec-Datei verifiziert das.
      logger.debug?.('[useEigenschutzKonfliktAufgeloestLive] connecting', { url });

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
      });

      socket.on('connect_error', (error: Error) => {
        logger.warn?.('[useEigenschutzKonfliktAufgeloestLive] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (errorPayload: { message?: string }) => {
        logger.warn?.('[useEigenschutzKonfliktAufgeloestLive] join rejected', errorPayload);
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEigenschutzKonfliktAufgeloestLive] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on(CHANNEL, (rawPayload: unknown) => {
        const parsed = KonfliktAufgeloestLiveSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useEigenschutzKonfliktAufgeloestLive] verworfen — ungültiger Payload', { issues: parsed.error.issues });
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
