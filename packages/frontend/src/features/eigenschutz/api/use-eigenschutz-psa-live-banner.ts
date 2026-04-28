import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import { getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { EIGENSCHUTZ_QUERY_KEYS } from './queries';

const NAMESPACE = '/ws/einsatz-events';

/** Wiederverbindungs-Backoff in Millisekunden (Story 2.7-Pattern). */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const;

/** LRU-Cache-Größe für Event-Dedup (Story 2.7 AC11 / Story 3.3 AC3). */
const EVENT_ID_CACHE_SIZE = 200;

/** WS-Channel-Name aus dem Backend-Adapter (`psa-profil-geaendert.adapter.ts`). */
const CHANNEL = 'eigenschutz:psa-profil-geaendert';

/** socket.io-Connect-Timeout (ms). Schützt vor stuck-`connecting` bei hängendem Handshake. */
const CONNECT_TIMEOUT_MS = 5_000;

/**
 * Cap für eigenständige Reconnect-Versuche. Nach `MAX_RETRIES` wechselt der
 * Hook auf `'error'` und stoppt — User-Action (z. B. Reload) ist nötig. Schützt
 * vor unbegrenzten Retry-Loops bei dauerhaftem Backend-Ausfall.
 */
const MAX_RETRIES = 10;

export type PsaProfilLiveAktion = 'AKTIVIERT' | 'DEAKTIVIERT';
export type PsaProfilLiveValue = 'BASIS' | 'INFEKTION' | 'VU' | 'CBRN_PATIENT' | 'VOLLSCHUTZ';

export interface PsaProfilLiveToggle {
  readonly profil: PsaProfilLiveValue;
  readonly aktion: PsaProfilLiveAktion;
  readonly zuweisungId: string;
}

/**
 * Banner-Eintrag — Aggregat pro `propagationGroupId`. Bulk-Operationen
 * (Story 3.2) lieferen mehrere Toggles unter derselben Group; das UI
 * rendert sie als **einen** kombinierten Banner (Story 3.3 AC5).
 */
export interface PsaProfilLiveBanner {
  readonly propagationGroupId: string;
  readonly einsatzId: string;
  readonly einheitId: string;
  readonly profilToggles: readonly PsaProfilLiveToggle[];
  /** Ältester Toggle-Zeitstempel der Gruppe (FIFO-Order). */
  readonly occurredAt: string;
  readonly userIdHash: string;
}

/**
 * Zod-Schema für den WS-Frame `eigenschutz:psa-profil-geaendert`
 * (Story 3.3 AC2). 1:1 gespiegelt aus dem Adapter-Vertrag in
 * `psa-profil-geaendert.adapter.ts:49–66`. **Begründung** ist absichtlich
 * NICHT enthalten — sie wird via Detail-Refetch geladen (Architektur §B5).
 */
const PsaProfilGeaendertWsPayloadSchema = z.object({
  eventId: z.string().min(1),
  einsatzId: z.string().min(1),
  einheitId: z.string().min(1),
  zuweisungId: z.string().min(1),
  propagationGroupId: z.string().min(1),
  profil: z.enum(['BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ']),
  aktion: z.enum(['AKTIVIERT', 'DEAKTIVIERT']),
  userIdHash: z.string().min(1),
  occurredAt: z.string().min(1),
});

type PsaProfilGeaendertWsPayload = z.infer<typeof PsaProfilGeaendertWsPayloadSchema>;

interface UseEigenschutzPsaLiveBannerOptions {
  einsatzId: string;
  einheitId: string | null;
  enabled?: boolean;
}

interface UseEigenschutzPsaLiveBannerResult {
  /** Aktuell gepufferte Banner-Einträge (FIFO via ältestem Toggle pro Group). */
  banner: readonly PsaProfilLiveBanner[];
  /** WS-Verbindungs-Status. */
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';
  /** Entfernt einen Banner-Eintrag aus der Queue (lokales Dismiss, kein Backend-Call). */
  dismiss: (propagationGroupId: string) => void;
}

const getWsBaseUrl = (): string => getBaseUrl() || 'http://localhost:3091';

/**
 * Live-Subscriber für `eigenschutz:psa-profil-geaendert` (Story 3.3 AC1–AC5).
 *
 * **Verantwortung:**
 * - WS-Subscription auf `/ws/einsatz-events` (`join:einsatz`).
 * - Hört auf den Channel `eigenschutz:psa-profil-geaendert`.
 * - Validiert Payload via Zod (AC2) **vor** dem Dedup-Cache.
 * - Filtert auf eigene Einheit (AC2: NFR-S5 Defense-in-Depth).
 * - LRU-Dedup über `eventId`, Größe 200 (AC3).
 * - Aggregiert Toggles derselben `propagationGroupId` zu einem Banner-Eintrag (AC5).
 * - Invalidiert `psaProfileByEinheit`-Query bei jedem Event und bei Reconnect (AC4).
 * - Backoff `1 → 2 → 5 → 10 → 30 s`, eigener Retry, sauberer Teardown vor jedem
 *   `connect()`, `connect_error`-/`disconnect`-Handler (Story 2.7-Pattern).
 *
 * **Begründung NICHT aus WS:** Architektur §B5 verbietet das. Die Detail-Query
 * `usePsaProfileByEinheit` ist die einzige zulässige Quelle für den Klartext.
 */
export function useEigenschutzPsaLiveBanner({ einsatzId, einheitId, enabled = true }: UseEigenschutzPsaLiveBannerOptions): UseEigenschutzPsaLiveBannerResult {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const retryIdxRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disposedRef = useRef(false);
  const eventIdCacheRef = useRef<Set<string>>(new Set());
  const eventIdOrderRef = useRef<string[]>([]);
  const [banner, setBanner] = useState<PsaProfilLiveBanner[]>([]);
  const [status, setStatus] = useState<UseEigenschutzPsaLiveBannerResult['status']>(enabled && einsatzId && einheitId !== null ? 'connecting' : 'disconnected');

  const matchesActiveEinheit = useCallback(
    (payloadEinheitId: string): boolean => {
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

  const dismiss = useCallback((propagationGroupId: string) => {
    setBanner((prev) => prev.filter((b) => b.propagationGroupId !== propagationGroupId));
  }, []);

  const invalidateLists = useCallback(() => {
    if (einheitId === null) return;
    void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.psaProfileByEinheit(einsatzId, einheitId) });
  }, [queryClient, einsatzId, einheitId]);

  // einsatzId-/einheitId-Wechsel löscht Banner-Queue + Dedup-LRU komplett (AC3).
  // Beide IDs in den Dependencies, damit ein Einsatz-Wechsel nicht alte Banner stehen lässt.
  useEffect(() => {
    setBanner([]);
    eventIdCacheRef.current = new Set();
    eventIdOrderRef.current = [];
  }, [einsatzId, einheitId]);

  useEffect(() => {
    if (!enabled || !einsatzId || einheitId === null) {
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
        logger.warn?.('[useEigenschutzPsaLiveBanner] retry-cap erreicht — User-Action erforderlich', { retries: retryIdxRef.current });
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

    const handlePayload = (payload: PsaProfilGeaendertWsPayload) => {
      if (disposedRef.current) return;
      // AC5: existierende Group erweitern, sonst neuer Eintrag.
      setBanner((prev) => {
        const idx = prev.findIndex((b) => b.propagationGroupId === payload.propagationGroupId);
        const newToggle: PsaProfilLiveToggle = {
          profil: payload.profil,
          aktion: payload.aktion,
          zuweisungId: payload.zuweisungId,
        };
        if (idx >= 0) {
          const existing = prev[idx]!;
          // Defensives Inkonsistenz-Logging: Wenn das Backend dieselbe
          // propagationGroupId für unterschiedliche Einheit/Einsatz schickt,
          // ist das ein Vertragsbruch — kein still-merge.
          if (existing.einheitId !== payload.einheitId || existing.einsatzId !== payload.einsatzId) {
            logger.warn?.('[useEigenschutzPsaLiveBanner] propagationGroupId-Kontext-Konflikt', {
              propagationGroupId: payload.propagationGroupId,
              existing: { einsatzId: existing.einsatzId, einheitId: existing.einheitId },
              incoming: { einsatzId: payload.einsatzId, einheitId: payload.einheitId },
            });
            return prev;
          }
          // Doppelte Toggles (gleiche zuweisungId) ignorieren — schützt
          // Order-of-arrival-Edge-Cases beim Reconnect-Backfill.
          if (existing.profilToggles.some((t) => t.zuweisungId === newToggle.zuweisungId)) {
            return prev;
          }
          const updated: PsaProfilLiveBanner = {
            ...existing,
            profilToggles: [...existing.profilToggles, newToggle],
            // Group behält ältesten occurredAt — kein Re-Order der Queue (AC5).
          };
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        const next: PsaProfilLiveBanner = {
          propagationGroupId: payload.propagationGroupId,
          einsatzId: payload.einsatzId,
          einheitId: payload.einheitId,
          profilToggles: [newToggle],
          occurredAt: payload.occurredAt,
          userIdHash: payload.userIdHash,
        };
        return [...prev, next];
      });

      // AC4: Detail-Refetch für Begründung + Klartext-User.
      invalidateLists();
    };

    const connect = () => {
      if (disposedRef.current) return;
      teardownSocket();

      logger.debug?.('[useEigenschutzPsaLiveBanner] connecting', { url, einsatzId });

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
        // Backfill nach Reconnect — verpasste Events laden via Refetch nach.
        invalidateLists();
      });

      socket.on('connect_error', (error: Error) => {
        logger.warn?.('[useEigenschutzPsaLiveBanner] connect_error', { message: error.message });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('join:einsatz:error', (errorPayload: { message?: string }) => {
        logger.warn?.('[useEigenschutzPsaLiveBanner] join rejected', errorPayload);
        if (disposedRef.current) return;
        // Bei transientem Auth-/Join-Fehler nicht permanent stuck bleiben — Reconnect mit Cap.
        setStatus('reconnecting');
        teardownSocket();
        scheduleReconnect();
      });

      socket.on('disconnect', (reason) => {
        logger.debug?.('[useEigenschutzPsaLiveBanner] disconnected', { reason });
        if (disposedRef.current) return;
        setStatus('reconnecting');
        scheduleReconnect();
      });

      socket.on(CHANNEL, (rawPayload: unknown) => {
        const parsed = PsaProfilGeaendertWsPayloadSchema.safeParse(rawPayload);
        if (!parsed.success) {
          // AC2: malformed Payloads werden ohne Side-Effect verworfen — weder
          // im Banner-State noch im Dedup-LRU.
          logger.warn?.('[useEigenschutzPsaLiveBanner] verworfen — ungültiger Payload', { issues: parsed.error.issues });
          return;
        }
        const payload = parsed.data;
        // AC2 / NFR-S5: Defense-in-Depth-Filter VOR dedupAdd, damit fremde
        // eventIds nicht den LRU verschmutzen (sonst würde ein theoretischer
        // legitimer Replay derselben eventId still verworfen werden).
        if (payload.einsatzId !== einsatzId) return;
        if (!matchesActiveEinheit(payload.einheitId)) return;
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
  }, [einsatzId, einheitId, enabled, matchesActiveEinheit, dedupAdd, invalidateLists]);

  // FIFO via ältestem Toggle-Zeitstempel der Gruppe (AC5: kein Re-Order beim Akkumulieren).
  // `Date.parse` ist robust gegen ISO-Varianten (Mikrosekunden, Zeitzonen-Offsets) — `localeCompare`
  // wäre nur akzidentell korrekt, solange alle Timestamps das gleiche Format teilen.
  const sorted = useMemo(() => {
    return [...banner].sort((a, b) => {
      const ta = Date.parse(a.occurredAt);
      const tb = Date.parse(b.occurredAt);
      const va = Number.isNaN(ta) ? 0 : ta;
      const vb = Number.isNaN(tb) ? 0 : tb;
      return va - vb;
    });
  }, [banner]);

  return { banner: sorted, status, dismiss };
}
