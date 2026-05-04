import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const NAMESPACE = '/ws/einsatz-events';
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const EVENT_ID_CACHE_SIZE = 200;
const NOTICE_FIFO_CAP = 50;
const CHANNEL = 'eigenschutz:konflikt-erkannt';
const CONNECT_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 10;

/**
 * Zod-Schema für den WS-Frame `eigenschutz:konflikt-erkannt`
 * (Story 3.9 AC6, gespiegelt aus dem Backend-Adapter).
 *
 * **PII-Vertrag:** `localPayload` ist **nicht** im Frame — der volle
 * Verlierer-State lebt nur in `sync_conflicts`-Row + Outbox-Event. Story 3.10
 * lädt ihn separat.
 */
export const KonfliktErkanntLiveSchema = z
  .object({
    eventId: z.string().min(1),
    einsatzId: z.string().min(1),
    einheitId: z.string().nullable(),
    entityType: z.enum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM']),
    entityId: z.string().min(1),
    fieldPath: z.string().max(200),
    serverVersion: z.number().int().positive(),
    localExpectedVersion: z.number().int().positive(),
    reportedByUserId: z.string().min(1),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type KonfliktErkanntLive = z.infer<typeof KonfliktErkanntLiveSchema>;

interface UseEigenschutzKonfliktErkanntLiveOptions {
  einsatzId: string;
  enabled?: boolean;
}

export interface KonfliktNotice extends KonfliktErkanntLive {
  /** Client-Empfangs-Zeitstempel; Auto-Dismiss-Timer berechnet sich daraus. */
  receivedAt: number;
}

interface UseEigenschutzKonfliktErkanntLiveResult {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  /** FIFO-Cap 50 — neue Konflikt-Notices oben. */
  notices: KonfliktNotice[];
  /** Entfernt eine Notice (User-Dismiss oder Auto-Dismiss-Timer). */
  dismissNotice: (eventId: string) => void;
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für `eigenschutz:konflikt-erkannt` (Story 3.9 AC8).
 *
 * **Verantwortung:**
 * - WS-Subscription auf `/ws/einsatz-events` mit `join:einsatz`.
 * - Validiert Payload via Zod **vor** Dedup-Cache (Story 2.7-Pattern).
 * - LRU-Dedup über `eventId`, Größe 200.
 * - Hält ein lokales `notices`-State (FIFO-Cap 50, Pattern Story 3.7).
 * - Bei validem Frame: invalidiert
 *   `psaProfileByEinheit(einsatzId, einheitId)` — der Verlierer-Tab muss
 *   seine PSA-Daten neu laden (Server-State hat sich nach dem Race
 *   verschoben). KEINE `sync-conflicts`-Query — die existiert erst in 3.10.
 *
 * **Sichtbarkeits-Filter (Konsumentenseite):** Alle Empfänger im Einsatz
 * erhalten den Frame; nur User mit `eigenschutz:psa:write` rendern den
 * `KonfliktErkanntMikroBanner` (Pattern Story 3.7 BEFEHLSGEBER-Gating).
 */
export function useEigenschutzKonfliktErkanntLive({ einsatzId, enabled = true }: UseEigenschutzKonfliktErkanntLiveOptions): UseEigenschutzKonfliktErkanntLiveResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const [status, setStatus] = useState<UseEigenschutzKonfliktErkanntLiveResult['status']>(enabled && einsatzId ? 'connecting' : 'disconnected');
  const [notices, setNotices] = useState<KonfliktNotice[]>([]);

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

  const dismissNotice = useCallback((eventId: string) => {
    setNotices((prev) => prev.filter((n) => n.eventId !== eventId));
  }, []);

  useEffect(() => {
    eventIdCacheRef.current = new Set();
    eventIdOrderRef.current = [];
    setNotices([]);
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
        logger.warn?.('[useEigenschutzKonfliktErkanntLive] retry-cap erreicht', { retries: retryIdxRef.current });
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

    const handlePayload = (payload: KonfliktErkanntLive) => {
      if (disposedRef.current) return;
      // Cache-Invalidation: Verlierer-Tab refresht seine PSA-Daten.
      // Code-Review P5: nur für PSA_PROFIL_ZUWEISUNG-Frames den
      // psaProfileByEinheit-Query invalidieren — bei
      // GEFAEHRDUNGSBEURTEILUNG_ITEM (Phase-2-Forward-Compat) wäre der
      // Cache der falsche.
      if (payload.einheitId && payload.entityType === 'PSA_PROFIL_ZUWEISUNG') {
        void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(einsatzId, payload.einheitId) });
      }
      // Code-Review P8: Story 3.9 ist PSA-only — der Banner zeigt
      // ausschließlich PSA-Konflikte. GB-Frames (Phase 2) durchlaufen die
      // Validation, werden hier aber von der Notice-Liste gefiltert; ihre
      // Behandlung kommt in Story 3.10/Phase 2 mit eigenem Banner.
      if (payload.entityType !== 'PSA_PROFIL_ZUWEISUNG') {
        return;
      }
      const notice: KonfliktNotice = { ...payload, receivedAt: Date.now() };
      setNotices((prev) => {
        const next = [notice, ...prev];
        return next.length > NOTICE_FIFO_CAP ? next.slice(0, NOTICE_FIFO_CAP) : next;
      });
    };

    const connect = () => {
      if (disposedRef.current) return;
      teardownSocket();

      logger.debug?.('[useEigenschutzKonfliktErkanntLive] connecting', { url, einsatzId });

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
        logger.warn?.('[useEigenschutzKonfliktErkanntLive] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (errorPayload: { message?: string }) => {
        logger.warn?.('[useEigenschutzKonfliktErkanntLive] join rejected', errorPayload);
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEigenschutzKonfliktErkanntLive] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on(CHANNEL, (rawPayload: unknown) => {
        const parsed = KonfliktErkanntLiveSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useEigenschutzKonfliktErkanntLive] verworfen — ungültiger Payload', { issues: parsed.error.issues });
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

  return { status, notices, dismissNotice };
}
