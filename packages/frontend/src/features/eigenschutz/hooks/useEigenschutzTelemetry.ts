import { useCallback, useEffect, useRef } from 'react';
import { api, getBaseUrl } from '@/shared/api/api';
import { logger } from '@/shared/lib/logger';
import { eigenschutzTelemetryQueue, type EigenschutzTelemetryEvent } from '../lib/telemetry-queue';

/**
 * Story 3.11 — Frontend-Flush-Hook für die Eigenschutz-Telemetrie-Queue.
 *
 * Drei UNABHÄNGIGE Flush-Trigger sind alle gleichzeitig aktiv:
 *
 * 1. **Timer:** alle 10 Sekunden — verhindert lange-laufende Sessions ohne
 *    Backend-Sync (CBRN-Auswertung soll near-real-time sein).
 * 2. **Threshold:** sobald die Queue ≥ 50 Events enthält. Backend akzeptiert
 *    Batches von 1–50 Events; ein größerer Batch würde abgelehnt. Hook
 *    abonniert die Queue (Story 3.11 — `subscribe()`), reagiert ohne
 *    Polling.
 * 3. **Visibility/Pagehide:** wenn der Tab versteckt wird oder der Browser
 *    die Seite entlädt, wird ein Best-Effort-Flush via
 *    `navigator.sendBeacon` (Fallback `fetch` mit `keepalive: true`)
 *    abgesetzt — der reguläre `fetch`-Pfad würde durch den Tab-Tear-Down
 *    abgebrochen.
 *
 * **Race-Sicherheit:** `inFlightRef` verhindert konkurrente Flushes. Wenn
 * ein Flush läuft, sind weitere Trigger No-Ops bis der laufende Flush
 * abgeschlossen ist.
 *
 * **Backpressure-Split:** nach Tab-Wakeup oder langem Hintergrund kann die
 * Queue mehr als 50 Events enthalten. Der Hook splittet den gedrainten
 * Batch in 50er-Chunks und sendet sie sequenziell.
 *
 * **Best-Effort-Semantik (AC9):** bei Network-Fail wird KEIN Re-Push in
 * die Queue erfolgen — Telemetrie ist nicht auftragskritisch und ein
 * Re-Push bei wiederholtem Fail würde die Queue füllen und alte Events
 * via Memory-Cap-Shift verlieren. Der Fehler wird einmalig geloggt.
 *
 * **Sicherheits-Hinweis:** Hook bleibt im Layout-Mount (Story-3.11-Wiring
 * in `eigenschutz.tsx`). Ohne aktiven Einsatz (`einsatzId === undefined`)
 * sind alle Trigger No-Ops.
 */
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_THRESHOLD = 50;
const MAX_BATCH_SIZE = 50;
/**
 * Konservatives Body-Größen-Cap für `navigator.sendBeacon` und `fetch`-keepalive.
 * Browser cappen beide Pfade in der Größenordnung von ~64 KiB; größere Bodies
 * werden silent verworfen (`sendBeacon` liefert `false`, `fetch keepalive`
 * wirft asynchron). Wir splitten den Chunk weiter, sobald das Cap überschritten
 * wird — pro halbierter Chunk so lange, bis er passt oder nur noch 1 Event
 * enthält (dann lassen wir den Browser entscheiden, weil ein 1-Event-Drop
 * besser ist als ein Crash).
 */
const BEACON_BODY_BYTE_CAP = 60_000;

/**
 * Konstruiert den Telemetrie-Endpoint mit dem aktiven Backend-Server. Wir
 * verwenden NICHT den generierten API-Client für sendBeacon, weil
 * `navigator.sendBeacon` keine `fetch`-Wrapper akzeptiert (kein eigenes
 * `fetchApi`-Pattern, kein Token-Refresh). URL-Konstruktion folgt dem
 * Backend-Pfad aus `EigenschutzApi.eigenschutzTelemetryControllerIngestVAlpha`.
 */
function buildTelemetryEndpointUrl(einsatzId: string): string {
  const base = getBaseUrl();
  const safeEinsatzId = encodeURIComponent(einsatzId);
  return `${base}/api/v-alpha/einsaetze/${safeEinsatzId}/sicherheit/eigenschutz/telemetry`;
}

/**
 * Splittet einen Event-Batch in Chunks von maximal `MAX_BATCH_SIZE`
 * Events. Story 3.11 — Backend lehnt Batches > 50 ab.
 */
function chunkEvents(events: EigenschutzTelemetryEvent[]): EigenschutzTelemetryEvent[][] {
  if (events.length <= MAX_BATCH_SIZE) {
    return [events];
  }
  const chunks: EigenschutzTelemetryEvent[][] = [];
  for (let i = 0; i < events.length; i += MAX_BATCH_SIZE) {
    chunks.push(events.slice(i, i + MAX_BATCH_SIZE));
  }
  return chunks;
}

/**
 * Serialisiert einen Event-Chunk zu einem JSON-Body. Defense-in-Depth gegen
 * cyclic metadata (theoretisch via crafted push) — `JSON.stringify` würfe
 * sonst, der ganze Batch ginge im sendBeacon-Pfad verloren. Liefert `null`,
 * wenn die Serialisierung fehlschlägt — Caller skippt den Chunk.
 */
function serializeChunkBody(chunk: EigenschutzTelemetryEvent[]): string | null {
  try {
    return JSON.stringify({ events: chunk });
  } catch {
    return null;
  }
}

/**
 * Splittet einen Chunk weiter auf, falls sein serialisierter JSON-Body das
 * Browser-Cap (`BEACON_BODY_BYTE_CAP`) überschreitet. Rekursiv halbierend, bis
 * jeder Sub-Chunk passt oder nur noch ein einzelnes Event enthält. Liefert ein
 * Array von `[chunk, body]`-Paaren — der Caller braucht beides nicht erneut zu
 * serialisieren.
 */
function chunksByByteCap(chunk: EigenschutzTelemetryEvent[]): Array<{ chunk: EigenschutzTelemetryEvent[]; body: string }> {
  const body = serializeChunkBody(chunk);
  if (body === null) return [];
  // Heuristik: UTF-8-Bytes sind ≥ Zeichen, aber bei reinem ASCII ≈ Zeichen-
  // Anzahl. Für die wenigen Sonderzeichen (DE-Umlaute) ist `length` als
  // Annäherung ausreichend — der Cap selbst ist konservativ gewählt.
  if (body.length <= BEACON_BODY_BYTE_CAP) return [{ chunk, body }];
  if (chunk.length <= 1) {
    // Einzelnes Event > Cap → wir überlassen es dem Browser. Besser einen
    // Drop dieses einen Events als gar nichts senden.
    return [{ chunk, body }];
  }
  const mid = Math.ceil(chunk.length / 2);
  return [...chunksByByteCap(chunk.slice(0, mid)), ...chunksByByteCap(chunk.slice(mid))];
}

export interface UseEigenschutzTelemetryResult {
  /**
   * Manuell ausgelöster Flush — primär für Tests + zukünftige Pfade
   * (z. B. „Erinnerung quittiert" → sofortiger Flush). No-Op, wenn ein
   * Flush bereits läuft oder die Queue leer ist.
   */
  readonly flushNow: () => void;
}

export function useEigenschutzTelemetry(einsatzId: string | undefined): UseEigenschutzTelemetryResult {
  const inFlightRef = useRef(false);
  const einsatzIdRef = useRef(einsatzId);

  // einsatzIdRef IM RENDER aktualisieren — useEffect feuert erst NACH dem
  // Commit-Phase, ein Timer-/Visibility-Callback der zwischen Render und
  // Commit feuert würde sonst die alte `einsatzId` lesen (Stale-Ref bei
  // schnellem Route-Wechsel zwischen Einsätzen).
  einsatzIdRef.current = einsatzId;

  /**
   * Normaler Flush-Pfad (timer, threshold, manual). Nutzt den generierten
   * API-Client, um Auth-Header + Token-Refresh konsistent zu halten.
   */
  const flushViaApi = useCallback(async (reason: 'timer' | 'threshold' | 'manual'): Promise<void> => {
    const currentEinsatzId = einsatzIdRef.current;
    if (!currentEinsatzId) return;
    if (inFlightRef.current) return;
    if (eigenschutzTelemetryQueue.size() === 0) return;

    inFlightRef.current = true;
    try {
      const events = eigenschutzTelemetryQueue.drain();
      if (events.length === 0) return;
      const chunks = chunkEvents(events);
      for (const chunk of chunks) {
        try {
          await api.eigenschutz().eigenschutzTelemetryControllerIngestVAlpha({
            einsatzId: currentEinsatzId,
            telemetryEventBatchDto: { events: chunk },
          });
        } catch (err) {
          // Best-Effort: KEIN Re-Push in die Queue (AC9). Ein Re-Push
          // würde bei dauerhaftem Network-Fail unbounded wachsen und
          // den Memory-Cap-Shift triggern, der ältere/wichtigere Events
          // verwirft.
          logger.warn?.('[useEigenschutzTelemetry] Flush fehlgeschlagen', {
            reason,
            count: chunk.length,
            err,
          });
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  /**
   * Visibility-/Pagehide-Pfad. `navigator.sendBeacon` ist der einzige
   * zuverlässige Weg, eine Anfrage während Tab-Tear-Down abzusetzen —
   * `fetch` ohne `keepalive` würde abgebrochen. Die Methode liefert
   * synchron `true`/`false`; bei `false` (oder fehlender API) fallen wir
   * auf `fetch` mit `keepalive: true` zurück.
   *
   * Auth: Cookies werden via `credentials: 'include'` mitgesendet —
   * der Backend-Endpoint nutzt JWT-Cookie-Auth wie alle anderen
   * Eigenschutz-Endpoints. Beacon-Pfad nutzt das gleiche Cookie-Set
   * automatisch (Browser-Standard).
   */
  const flushViaBeacon = useCallback((): void => {
    const currentEinsatzId = einsatzIdRef.current;
    if (!currentEinsatzId) return;
    if (inFlightRef.current) return;
    if (eigenschutzTelemetryQueue.size() === 0) return;

    inFlightRef.current = true;
    try {
      const events = eigenschutzTelemetryQueue.drain();
      if (events.length === 0) return;
      const url = buildTelemetryEndpointUrl(currentEinsatzId);
      const chunks = chunkEvents(events);
      for (const chunk of chunks) {
        // Cyclic-Metadata-Defense + Body-Cap-Splitting in einem Schritt:
        // `chunksByByteCap` liefert nur seriaisierbare Sub-Chunks zurück.
        const subChunks = chunksByByteCap(chunk);
        if (subChunks.length === 0) {
          logger.warn?.('[useEigenschutzTelemetry] Beacon-Chunk konnte nicht serialisiert werden', { chunkSize: chunk.length });
          continue;
        }
        for (const { body } of subChunks) {
          const beacon = typeof navigator !== 'undefined' ? navigator.sendBeacon?.bind(navigator) : undefined;
          let sent = false;
          if (beacon) {
            try {
              const blob = new Blob([body], { type: 'application/json' });
              sent = beacon(url, blob);
            } catch (err) {
              logger.warn?.('[useEigenschutzTelemetry] sendBeacon warf Fehler', { err });
              sent = false;
            }
          }
          if (!sent) {
            // Fallback: `fetch` mit `keepalive: true` — vom Browser über
            // den Tab-Lifecycle hinaus weitergeführt (max ~64 KB Body).
            try {
              void fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                keepalive: true,
                credentials: 'include',
              }).catch((err) => {
                logger.warn?.('[useEigenschutzTelemetry] keepalive-fetch fehlgeschlagen', { err });
              });
            } catch (err) {
              logger.warn?.('[useEigenschutzTelemetry] keepalive-fetch warf synchron', { err });
            }
          }
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const flushNow = useCallback((): void => {
    void flushViaApi('manual');
  }, [flushViaApi]);

  // Trigger 1: Timer
  useEffect(() => {
    if (!einsatzId) return;
    const id = window.setInterval(() => {
      void flushViaApi('timer');
    }, FLUSH_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
    };
  }, [einsatzId, flushViaApi]);

  // Trigger 2: Threshold (Queue-Subscribe)
  useEffect(() => {
    if (!einsatzId) return;
    const unsubscribe = eigenschutzTelemetryQueue.subscribe(() => {
      if (eigenschutzTelemetryQueue.size() >= FLUSH_THRESHOLD) {
        void flushViaApi('threshold');
      }
    });
    return unsubscribe;
  }, [einsatzId, flushViaApi]);

  // Trigger 3: Visibility / Pagehide → sendBeacon-Pfad
  useEffect(() => {
    if (!einsatzId) return;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        flushViaBeacon();
      }
    };
    const onPageHide = (): void => {
      flushViaBeacon();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [einsatzId, flushViaBeacon]);

  return { flushNow };
}
