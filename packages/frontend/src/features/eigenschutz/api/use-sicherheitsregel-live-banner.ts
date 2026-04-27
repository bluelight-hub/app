import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const NAMESPACE = '/ws/einsatz-events';

/** Wiederverbindungs-Backoff in Millisekunden. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

/** LRU-Cache-Größe für Event-Dedup (Story 2.7 AC11). */
const EVENT_ID_CACHE_SIZE = 200;

/**
 * Banner-Eintrag — was die UI rendert.
 *
 * `tone` differenziert zwischen Erst-Bekanntgabe (`info`) und
 * Änderungsbekanntgabe (`warning`); UI mappt das auf den `SeverityBanner`-
 * Variant.
 */
export interface SicherheitsregelBanner {
  regelId: string;
  einsatzId: string;
  einheitId: string | null;
  einsatzweit: boolean;
  propagationGroupId: string | null;
  fromVersion: number | null;
  toVersion: number;
  titel: string;
  /** Anriss des Regel-Inhalts (≤ 140 Zeichen). Story 2.7 AC1. Optional. */
  inhaltAnriss?: string;
  occurredAt: string;
  /** `info` = neu ausgerufen, `warning` = Änderung einer aktiven Regel. */
  variant: 'info' | 'warning';
}

/**
 * Zod-Schemas für die WS-Payloads (Story 2.7 AC6 + Code-Review-Patch
 * „Payload-Validierung vor `dedupAdd`"). Malformed Events landen weder im
 * dedup-LRU noch im Banner-State — sie werden geloggt und verworfen.
 */
const SicherheitsregelAusgerufenWsPayloadSchema = z.object({
  eventId: z.string().min(1),
  regelId: z.string().min(1),
  einsatzId: z.string().min(1),
  einheitId: z.string().min(1).nullable(),
  einsatzweit: z.boolean(),
  propagationGroupId: z.string().min(1).nullable(),
  fromVersion: z.number().int().nullable(),
  toVersion: z.number().int().nonnegative(),
  changedFields: z
    .object({
      created: z.boolean().optional(),
      updated: z.array(z.string()).optional(),
      deprecated: z.boolean().optional(),
    })
    .default({}),
  titel: z.string().min(1),
  /**
   * Anriss des Regel-Inhalts (≤ 140 Zeichen, server-seitig truncated). Story
   * 2.7 AC1 verlangt einen Body im Banner; AC6 schließt den vollen `inhalt`
   * aus der WS-Payload aus, deshalb der explizit gekürzte Anriss. Optional —
   * ältere Backends ohne den Field-Roll-out liefern den Banner ohne Body.
   */
  inhaltAnriss: z.string().max(140).optional(),
});

const SicherheitsregelQuittiertWsPayloadSchema = z.object({
  eventId: z.string().min(1),
  regelId: z.string().min(1),
  einsatzId: z.string().min(1),
  einheitId: z.string().min(1),
  propagationGroupId: z.string().min(1).nullable(),
  userId: z.string().min(1),
  quittiertAm: z.string().min(1),
  occurredAt: z.string().min(1),
});

type SicherheitsregelAusgerufenWsPayload = z.infer<typeof SicherheitsregelAusgerufenWsPayloadSchema>;
type SicherheitsregelQuittiertWsPayload = z.infer<typeof SicherheitsregelQuittiertWsPayloadSchema>;

interface UseSicherheitsregelLiveBannerOptions {
  einsatzId: string;
  einheitId: string | null;
  enabled?: boolean;
}

interface UseSicherheitsregelLiveBannerResult {
  /** Aktuell sichtbare Banner für die aktive Einheit (FIFO-Sortierung — älteste zuerst). */
  banner: SicherheitsregelBanner[];
  /** WS-Verbindungs-Status. */
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  /**
   * Entfernt einen Banner aus der Queue (z. B. nach erfolgreicher Quittung —
   * der Hook entfernt ihn automatisch beim `:quittiert`-Event, der explizite
   * Aufruf hier erlaubt UI-Komponenten optimistisches Verschwinden, sobald
   * die Mutation startet).
   */
  dismiss: (regelId: string) => void;
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für Sicherheitsregel-Events (Story 2.7 AC11).
 *
 * **Verantwortung:**
 * - Öffnet WS-Subscription auf `/ws/einsatz-events` und sendet `join:einsatz`.
 * - Hört auf `sicherheitsregel:ausgerufen` und `sicherheitsregel:quittiert`.
 * - Filtert eingehende Events: `payload.einheitId === activeEinheitId` ODER
 *   `payload.einsatzweit === true`.
 * - Banner-Queue mit `eventId`-LRU-Dedup (Größe 200).
 * - Bei Reconnect → `useSicherheitsregeln`-Cache invalidieren (Backfill).
 * - Bei `sicherheitsregel:quittiert` für die eigene Einheit → Banner aus der
 *   Queue entfernen (matched über `regelId`).
 *
 * **Backoff:** 1 → 2 → 5 → 10 → 30 Sekunden, mit `socket.io-client`-Auto-Reconnect
 * deaktiviert (eigener Retry-Zähler, damit die Kadenz steuerbar bleibt).
 */
export function useSicherheitsregelLiveBanner({ einsatzId, einheitId, enabled = true }: UseSicherheitsregelLiveBannerOptions): UseSicherheitsregelLiveBannerResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const [banner, setBanner] = useState<SicherheitsregelBanner[]>([]);
  const [status, setStatus] = useState<UseSicherheitsregelLiveBannerResult['status']>(enabled && einsatzId ? 'connecting' : 'disconnected');

  const matchesActiveEinheit = useCallback(
    (payloadEinheitId: string | null, einsatzweit: boolean): boolean => {
      if (einsatzweit) return true;
      if (einheitId === null) return false;
      return payloadEinheitId === einheitId;
    },
    [einheitId],
  );

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

  const dismiss = useCallback((regelId: string) => {
    setBanner((prev) => prev.filter((b) => b.regelId !== regelId));
  }, []);

  const invalidateLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln(einsatzId) });
  }, [queryClient, einsatzId]);

  // einheitId-Wechsel löscht Banner-Queue + dedup-LRU, damit keine Banner
  // aus der vorherigen Einheit „durchgereicht" werden (Story 2.7 Code-Review-
  // Patch). Der Connection-Lifecycle bleibt im Haupteffekt.
  useEffect(() => {
    setBanner([]);
    eventIdCacheRef.current = new Set();
    eventIdOrderRef.current = [];
  }, [einheitId]);

  useEffect(() => {
    if (!enabled || !einsatzId) {
      setStatus('disconnected');
      return;
    }

    disposedRef.current = false;
    const baseUrl = getWsBaseUrl();
    const url = `${baseUrl}${NAMESPACE}`;

    /**
     * Schließt den aktiven Socket sauber und setzt `socketRef.current = null`.
     * Verhindert Listener-Leaks beim Reconnect (Story 2.7 Code-Review-Patch).
     */
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

    const connect = () => {
      if (disposedRef.current) return;
      // Sauberer Teardown vor jedem neuen `io()`-Aufruf — sonst akkumulieren
      // sich Listener auf dem alten Socket-Objekt (Story 2.7 Code-Review-Patch:
      // Socket-Leak auf Reconnect).
      teardownSocket();

      logger.debug?.('[useSicherheitsregelLiveBanner] connecting', { url, einsatzId });

      const socket = io(url, { transports: ['websocket'], reconnection: false, withCredentials: true });
      socketRef.current = socket;

      socket.on('connect', () => {
        retryIdxRef.current = 0;
        setStatus('connected');
        socket.emit('join:einsatz', { einsatzId });
        // Backfill nach Reconnect — verpasste Events kommen aus dem Server-Cache zurück.
        invalidateLists();
      });

      // `connect_error` feuert, wenn die initiale WS-Verbindung scheitert
      // (z. B. Server down, TLS-Handshake-Fehler). Mit `reconnection: false`
      // würde der Status sonst dauerhaft auf `connecting` hängen — wir
      // triggern stattdessen unseren eigenen Backoff (Story 2.7 Code-Review-
      // Patch: connect_error-Handler).
      socket.on('connect_error', (error: Error) => {
        logger.warn?.('[useSicherheitsregelLiveBanner] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (payload: { message?: string }) => {
        logger.warn?.('[useSicherheitsregelLiveBanner] join rejected', payload);
        setStatus('error');
        teardownSocket();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useSicherheitsregelLiveBanner] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on('sicherheitsregel:ausgerufen', (rawPayload: unknown) => {
        const parsed = SicherheitsregelAusgerufenWsPayloadSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useSicherheitsregelLiveBanner] verworfen — ungültiger ausgerufen-Payload', { issues: parsed.error.issues });
          return;
        }
        const payload: SicherheitsregelAusgerufenWsPayload = parsed.data;

        if (!dedupAdd(payload.eventId)) return;
        if (!matchesActiveEinheit(payload.einheitId, payload.einsatzweit)) return;

        // Deprecated-Events sollen den Banner aus der Queue entfernen
        // (Re-Wire-Pfad — die Regel wurde in andere Einheiten umgehängt).
        if (payload.changedFields?.deprecated === true) {
          setBanner((prev) => prev.filter((b) => b.regelId !== payload.regelId));
          return;
        }

        const variant: 'info' | 'warning' = payload.changedFields?.created === true ? 'info' : 'warning';
        const next: SicherheitsregelBanner = {
          regelId: payload.regelId,
          einsatzId: payload.einsatzId,
          einheitId: payload.einheitId,
          einsatzweit: payload.einsatzweit,
          propagationGroupId: payload.propagationGroupId,
          fromVersion: payload.fromVersion,
          toVersion: payload.toVersion,
          titel: payload.titel,
          inhaltAnriss: payload.inhaltAnriss,
          occurredAt: payload.occurredAt,
          variant,
        };
        setBanner((prev) => {
          // Update statt Duplicate-Insert, wenn die Regel bereits in der Queue ist.
          const existingIdx = prev.findIndex((b) => b.regelId === next.regelId);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = next;
            return copy;
          }
          return [...prev, next];
        });
      });

      socket.on('sicherheitsregel:quittiert', (rawPayload: unknown) => {
        const parsed = SicherheitsregelQuittiertWsPayloadSchema.safeParse(rawPayload);
        if (!parsed.success) {
          logger.warn?.('[useSicherheitsregelLiveBanner] verworfen — ungültiger quittiert-Payload', { issues: parsed.error.issues });
          return;
        }
        const payload: SicherheitsregelQuittiertWsPayload = parsed.data;

        if (!dedupAdd(payload.eventId)) return;
        // Wenn die eigene Einheit quittiert hat → Banner verschwindet.
        if (payload.einheitId === einheitId) {
          dismiss(payload.regelId);
        }
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
  }, [einsatzId, einheitId, enabled, matchesActiveEinheit, dedupAdd, dismiss, invalidateLists]);

  // FIFO-Sortierung nach occurredAt (älteste zuerst, neueste unten — Story 2.7 AC12).
  const sorted = useMemo(() => [...banner].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)), [banner]);

  return { banner: sorted, status, dismiss };
}
