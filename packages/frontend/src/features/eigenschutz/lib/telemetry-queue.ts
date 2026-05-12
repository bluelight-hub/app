import { logger } from '@/shared/lib/logger';

/**
 * Minimale Telemetrie-Queue für Eigenschutz-CBRN-Moment (Story 3.1 AC10 /
 * Vorbereitung Story 3.11).
 *
 * **Scope Story 3.1:** Capture, kein Upload. Story 3.11 baut den Backend-
 * Endpoint und einen Flush-Mechanismus; aktuell sammeln wir die Events nur
 * im Modul-Level-Array (kein Persist), damit Story 3.11 sie konsumieren
 * kann, sobald sie landet.
 *
 * **Schema-Vertrag:** Felder sind 1:1 die, die Story 3.11 erwartet
 * (`propagationGroupIdCandidate`, `abschnittCount`, `userId`, `sessionId`,
 * `clientTime`). Migration auf einen TanStack-Store oder einen IndexedDB-
 * gepufferten Buffer ist trivial — die Public-API bleibt stabil.
 */

export type EigenschutzTelemetryEventName =
  | 'assess_started'
  | 'assess_completed'
  | 'assess_aborted'
  | 'cbrn_announced'
  | 'cbrn_acknowledged'
  | 'all_banners_delivered'
  | 'psa_quittung_abgegeben'
  | 'blind_ack'
  | 'luecke_gemeldet'
  | 'quittung_ueberfaellig';

export interface EigenschutzTelemetryEvent {
  readonly eventName: EigenschutzTelemetryEventName;
  readonly propagationGroupIdCandidate: string;
  readonly abschnittCount: number;
  readonly userId: string;
  readonly sessionId: string;
  readonly clientTime: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

const MAX_QUEUE_SIZE = 500;

const queue: EigenschutzTelemetryEvent[] = [];
let droppedCount = 0;

/**
 * Subscriber-Set für Story-3.11-Flush-Hook (`useEigenschutzTelemetry`).
 *
 * Jeder Listener wird nach jedem `push()` synchron benachrichtigt — der
 * Hook nutzt das, um Threshold-Flush (≥ 50 Events) ohne Polling zu
 * triggern. Modul-Level-Set bleibt konsistent mit dem Modul-Level-Array.
 */
const subscribers: Set<() => void> = new Set();

function notifySubscribers(): void {
  // Iteration über Snapshot, sonst kann ein Listener, der innerhalb der
  // Notify-Schleife `subscribe(...)` aufruft, das Set während der Iteration
  // mutieren — das `Set`-Iterator-Verhalten würde den neuen Listener noch
  // einbeziehen.
  const snapshot = Array.from(subscribers);
  for (const listener of snapshot) {
    try {
      listener();
    } catch (err) {
      // Listener-Fehler dürfen den push()-Pfad nicht brechen — Telemetrie ist
      // best-effort. Aber STILL-Swallow ist falsch: ein synchroner Throw aus
      // einem Threshold-Subscriber würde sonst still die Flush-Schleife killen.
      logger.warn?.('[eigenschutzTelemetryQueue] Subscriber-Listener warf Fehler', { err });
    }
  }
}

export const eigenschutzTelemetryQueue = {
  /**
   * Hängt ein Telemetrie-Event an die In-Memory-Queue. Story 3.11 ergänzt
   * den Flush-Pfad zum Backend; Story 3.1 konsumiert den Bestand nicht.
   *
   * **Memory-Cap:** Bei Überlauf werden die ältesten Events verworfen
   * (`shift()`). Das schützt langlebige Browser-Sessions ohne Flush vor
   * unbounded Heap-Growth (Code-Review P-36). Sobald Story 3.11 den Backend-
   * Flush baut, sollte die Queue auf einen TanStack-Store oder einen
   * IndexedDB-gepufferten Buffer wechseln.
   *
   * **Story 3.11:** Nach jedem `push()` werden alle via `subscribe()`
   * registrierten Listener synchron aufgerufen, damit der Flush-Hook auf
   * Schwellwerte reagieren kann.
   */
  push(event: EigenschutzTelemetryEvent): void {
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift();
      droppedCount += 1;
      // Story 3.11 — Code-Review-Patch: Stille Drop-Loss ist nicht akzeptabel
      // für CBRN-Auswertung. Wir loggen alle 50 Drops einmal, damit Operatoren
      // einen Indikator haben, wenn ein Backend-Outage die Queue füllt.
      if (droppedCount === 1 || droppedCount % 50 === 0) {
        logger.warn?.('[eigenschutzTelemetryQueue] Memory-Cap überschritten — älteste Events verworfen', {
          totalDropped: droppedCount,
          queueSize: queue.length,
        });
      }
    }
    queue.push(event);
    notifySubscribers();
  },

  /**
   * Liefert eine Snapshot-Kopie aller bisher gesammelten Events. Wird primär
   * von Tests und Story 3.11 (Future Flush) genutzt.
   */
  snapshot(): readonly EigenschutzTelemetryEvent[] {
    return [...queue];
  },

  /** Setzt die Queue zurück (Tests + Story-3.11-Flush-Implementation). */
  drain(): EigenschutzTelemetryEvent[] {
    const items = queue.splice(0, queue.length);
    return items;
  },

  /**
   * Aktuelle Queue-Länge — Story 3.11 nutzt das für den Threshold-Flush
   * (≥ 50 Events). Konsumenten dürfen das Ergebnis lesen, aber NICHT
   * mutieren.
   */
  size(): number {
    return queue.length;
  },

  /**
   * Registriert einen Listener, der nach jedem `push()` aufgerufen wird.
   * Gibt eine Unsubscribe-Funktion zurück. Story 3.11 nutzt das, um den
   * Threshold-Flush ohne Polling zu triggern.
   */
  subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  },
};

/**
 * Erzeugt eine deterministische Session-ID pro Browser-Lebenszyklus —
 * `crypto.randomUUID()` ist im Frontend ohne Polyfill verfügbar (alle
 * Zielbrowser unterstützen es). Story 3.11 verbindet das mit dem
 * Telemetrie-Backend.
 */
let cachedSessionId: string | null = null;
export function getOrCreateSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  const cryptoApi = typeof globalThis !== 'undefined' && 'crypto' in globalThis ? (globalThis.crypto as Crypto) : null;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    cachedSessionId = cryptoApi.randomUUID();
  } else if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    // Fallback für sehr alte Browser ohne randomUUID: 128 Bit aus getRandomValues
    // statt Math.random (CodeQL js/insecure-randomness, Session-ID landet im
    // Telemetrie-Pfad und identifiziert User-Sessions).
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    cachedSessionId = `session-${Date.now()}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  } else {
    // Letztes Sicherheitsnetz für nicht-Browser-Umgebungen ohne Crypto-API.
    cachedSessionId = `session-${Date.now()}-fallback`;
  }
  return cachedSessionId;
}

/** Nur für Tests — vergisst den gecachten `sessionId`. */
export function __resetSessionIdForTests(): void {
  cachedSessionId = null;
}

/** Nur für Tests — setzt den Drop-Counter zurück. */
export function __resetDroppedCountForTests(): void {
  droppedCount = 0;
}

/** Aktueller Drop-Counter — Telemetrie-of-Loss-Signal (Story 3.11 Code-Review). */
export function getEigenschutzTelemetryDroppedCount(): number {
  return droppedCount;
}
