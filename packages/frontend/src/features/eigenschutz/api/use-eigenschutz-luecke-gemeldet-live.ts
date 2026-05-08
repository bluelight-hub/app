import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const NAMESPACE = '/ws/einsatz-events';

/** Wiederverbindungs-Backoff in Millisekunden (Story 3.4-Pattern). */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

/** LRU-Cache-Größe für Event-Dedup (Story 3.6 AC14 — analog Story 3.4). */
const EVENT_ID_CACHE_SIZE = 200;

/** WS-Channel-Name aus dem Backend-Adapter (`luecke-gemeldet.adapter.ts`). */
const CHANNEL = 'eigenschutz:luecke-gemeldet';

/** socket.io-Connect-Timeout (ms). Schützt vor stuck-`connecting`. */
const CONNECT_TIMEOUT_MS = 5_000;

/** Cap für eigenständige Reconnect-Versuche. */
const MAX_RETRIES = 10;

/**
 * Zod-Schema für den WS-Frame `eigenschutz:luecke-gemeldet`
 * (Story 3.6 AC14). 1:1 gespiegelt aus dem Adapter-Vertrag in
 * `luecke-gemeldet.adapter.ts`. PII-Diät: nur `userIdHash` (kein
 * Klartext-`userId`); Klartext-`meldung` wird **NICHT** im Frame
 * transportiert — `meldungLength` reicht als Live-Indikator. Den Volltext
 * lädt der Sender per REST-Refetch.
 */
const LueckeGemeldetLiveSchema = z.object({
  eventId: z.string().min(1),
  einsatzId: z.string().min(1),
  einheitId: z.string().min(1),
  propagationGroupId: z.string().min(1),
  userIdHash: z.string().min(1),
  meldungLength: z.number().int().nonnegative(),
  // ISO-DateTime statt freiem String — fängt Backend-Bugs auf, die einen
  // invaliden Timestamp emittieren, bevor wir auf Junk-Daten Cache-
  // Invalidierungen auslösen.
  gemeldetAm: z.string().datetime({ offset: true }),
  occurredAt: z.string().datetime({ offset: true }),
});

type LueckeGemeldetLive = z.infer<typeof LueckeGemeldetLiveSchema>;

interface UseEigenschutzLueckeGemeldetLiveOptions {
  einsatzId: string;
  enabled?: boolean;
}

interface UseEigenschutzLueckeGemeldetLiveResult {
  /** WS-Verbindungs-Status. */
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für `eigenschutz:luecke-gemeldet` (Story 3.6 AC14).
 *
 * **Verantwortung — rein Cache-Invalidator (Sender-Sicht):**
 * - WS-Subscription auf `/ws/einsatz-events` (`join:einsatz`).
 * - Hört auf den Channel `eigenschutz:luecke-gemeldet`.
 * - Validiert Payload via Zod **vor** dem Dedup-Cache (Story 2.7-Pattern).
 * - LRU-Dedup über `eventId`, Größe 200.
 * - Bei validem Frame: invalidiert `psaQuittungen(einsatzId,
 *   propagationGroupId)` UND `offenePsaBekanntgaben(einsatzId)` —
 *   REST-Refetch ist authoritative; das `lueckenCount`-Badge in der
 *   `OffenePsaBekanntgabenSection` (AC13) aktualisiert sich live.
 * - Backoff `1 → 2 → 5 → 10 → 30 s`, sauberer Teardown vor jedem `connect()`.
 *
 * **MVP-Pragmatik (Q7-Default):** Story 3.6 implementiert den dedizierten
 * `polite`-Mikro-Banner NICHT — die `lueckenCount`-Badge-Live-Aktualisierung
 * reicht für den Stab-Workflow. Story 6.4 liefert das System-weite
 * Mikro-Banner-Pattern.
 *
 * **Klartext-Meldung NICHT im WS-Frame:** Architektur §B5 — der Klartext
 * der Notiz lädt der Sender-View aus dem REST-Refetch (`useEigenschutzPsaQuittungen`).
 */
export function useEigenschutzLueckeGemeldetLive({ einsatzId, enabled = true }: UseEigenschutzLueckeGemeldetLiveOptions): UseEigenschutzLueckeGemeldetLiveResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const [status, setStatus] = useState<UseEigenschutzLueckeGemeldetLiveResult['status']>(enabled && einsatzId ? 'connecting' : 'disconnected');

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
        logger.warn?.('[useEigenschutzLueckeGemeldetLive] retry-cap erreicht — User-Action erforderlich', { retries: retryIdxRef.current });
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

    const handlePayload = (payload: LueckeGemeldetLive) => {
      if (disposedRef.current) return;
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaQuittungen(einsatzId, payload.propagationGroupId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen(einsatzId) });
      // Empfänger-Detail-Sicht (Drawer/EquipmentChecklist) lebt von dieser
      // Query — Konsistenz zur Mutation-Hook-Invalidierung in `useMeldeLuecke`.
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(einsatzId, payload.einheitId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus(einsatzId) });
    };

    const invalidateAfterReconnect = () => {
      // Nach Reconnect: Backfill verpasster Lücken-Meldungen via Listen-Refetch.
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offenePsaBekanntgaben(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.offeneRueckmeldungen(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.ampelStatus(einsatzId) });
    };

    const connect = () => {
      if (disposedRef.current) return;
      teardownSocket();

      logger.debug?.('[useEigenschutzLueckeGemeldetLive] connecting', { url, einsatzId });

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
        logger.warn?.('[useEigenschutzLueckeGemeldetLive] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (errorPayload: { message?: string }) => {
        logger.warn?.('[useEigenschutzLueckeGemeldetLive] join rejected', errorPayload);
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEigenschutzLueckeGemeldetLive] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on(CHANNEL, (rawPayload: unknown) => {
        const parsed = LueckeGemeldetLiveSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useEigenschutzLueckeGemeldetLive] verworfen — ungültiger Payload', { issues: parsed.error.issues });
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
