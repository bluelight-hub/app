import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { KonfliktAufgeloestWsPayloadSchema, type KonfliktAufgeloestWsPayload } from '@bluelight-hub/shared/schemas';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { findAndDismissNoticeByEntity } from './use-eigenschutz-konflikt-erkannt-live';

const NAMESPACE = '/ws/einsatz-events';
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;
const EVENT_ID_CACHE_SIZE = 200;
const CHANNEL = 'eigenschutz:konflikt-aufgeloest';
const CONNECT_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 10;

/**
 * **Single-Source-of-Truth-Re-Export** des Shared-Schemas.
 *
 * Bis Patch F11 hielt dieser Hook ein dupliziertes Inline-Schema mit dem
 * Begründungs-Kommentar „Backend ESM/CJS-Interop". Inzwischen importiert
 * das Frontend bereits an mehreren Stellen aus `@bluelight-hub/shared`/
 * `@bluelight-hub/shared/schemas` (z. B. `auth.schema.ts`,
 * `RiskMatrix5x5.tsx`, `GefaehrdungItemEditor.tsx`); die ESM/CJS-Hürde
 * besteht nicht mehr für das Frontend. Das Backend hingegen bleibt CJS
 * und konsumiert weiterhin einen lokalen Mirror (s.
 * `konflikt-aufgeloest.adapter.spec.ts`).
 *
 * Re-Export erhält den bisherigen Symbol-Namen (`KonfliktAufgeloestLiveSchema`)
 * für Konsumenten und Tests, ohne dass Drift zwischen Frontend-Hook und
 * Shared-Schema möglich ist.
 *
 * **PII-Vertrag:** der Frame trägt keinen `localPayload` — der volle
 * Verlierer-State lebt nur in `sync_conflicts`-Row + Outbox-Event.
 */
export const KonfliktAufgeloestLiveSchema = KonfliktAufgeloestWsPayloadSchema;
export type KonfliktAufgeloestLive = KonfliktAufgeloestWsPayload;

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
 * **Cross-Hook-Dismiss (Story 3.10 AC7 §4 / Code-Review D1):** ruft
 * `findAndDismissNoticeByEntity` aus dem Erkannt-Hook mit dem Composite-
 * Korrelator (`entityId + entityType + fieldPath`). Falls eine passende
 * Story-3.9-Mikro-Banner-Notice existiert, wird sie sofort dismisst —
 * statt erst nach dem 30 s-Auto-Dismiss. Variante A aus dem Patch-Plan:
 * kein Backend-Schema-Bump, weil `syncConflictId` im Erkannt-Frame
 * (loser POSTet erst NACH dem Erkannt-Event) gar nicht verfügbar wäre.
 *
 * **Kein UI-State im Aufgeloest-Hook:** der Hook rendert keinen Banner.
 * Der Mikro-Banner aus Story 3.9 wird über die Cross-Hook-Registry
 * geschlossen.
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

    const handlePayload = (payload: KonfliktAufgeloestLive) => {
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

      // Story 3.10 AC7 §4 — Cross-Hook-Dismiss:
      // Falls der Story-3.9-Mikro-Banner für genau diesen Konflikt noch
      // sichtbar ist, sofort schließen statt 30 s Auto-Dismiss abzuwarten.
      // Composite-Korrelator (`entityId + entityType + fieldPath`) — die
      // beiden Frames tragen verschiedene `eventId`s, aber identische
      // Entitäts-Koordinaten.
      findAndDismissNoticeByEntity({
        einsatzId,
        entityId: payload.entityId,
        entityType: payload.entityType,
        fieldPath: payload.fieldPath,
      });
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
