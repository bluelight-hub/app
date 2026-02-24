import { WarnungTyp } from '@domain/value-objects/warnung-typ';

/**
 * Konfiguration fuer Monitoring-Schwellwerte.
 *
 * Definiert die Grenzwerte, bei deren Ueberschreitung
 * eine SystemWarnungEvent emittiert wird.
 *
 * @remarks Story 5.6 AC3
 */
export interface SchwellwertConfig {
  /** Minimale akzeptable Zustellrate in Prozent (Default: 95) */
  zustellrateMin: number;
  /** Maximale akzeptable Outbox-Queue-Tiefe (Default: 100) */
  outboxQueueDepthMax: number;
  /** Maximale akzeptable API-Latenz (p95) in Millisekunden (Default: 2000) */
  latenzP95Max: number;
}

/** Default-Schwellwerte */
export const DEFAULT_SCHWELLWERT_CONFIG: SchwellwertConfig = {
  zustellrateMin: 95,
  outboxQueueDepthMax: 100,
  latenzP95Max: 2000,
};

/**
 * Mapping von Schwellwert-Typ zu WarnungTyp.
 * Wird fuer die Event-Erstellung verwendet.
 */
export const SCHWELLWERT_WARNUNG_MAP: Record<string, WarnungTyp> = {
  zustellrate: WarnungTyp.ZUSTELLRATE,
  outboxQueueDepth: WarnungTyp.OUTBOX_STAU,
  latenz: WarnungTyp.LATENZ,
};
