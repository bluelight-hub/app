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

export type EigenschutzTelemetryEventName = 'assess_started' | 'assess_completed' | 'assess_aborted' | 'cbrn_announced' | 'cbrn_acknowledged' | 'all_banners_delivered' | 'psa_quittung_abgegeben';

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
   */
  push(event: EigenschutzTelemetryEvent): void {
    if (queue.length >= MAX_QUEUE_SIZE) {
      queue.shift();
    }
    queue.push(event);
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
  cachedSessionId = cryptoApi && typeof cryptoApi.randomUUID === 'function' ? cryptoApi.randomUUID() : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return cachedSessionId;
}

/** Nur für Tests — vergisst den gecachten `sessionId`. */
export function __resetSessionIdForTests(): void {
  cachedSessionId = null;
}
