/**
 * Prometheus-Collector für Eigenschutz-Telemetrie (Story 3.11 AC4).
 *
 * Wandelt persistierte `EigenschutzTelemetryEvent`-Inputs in drei
 * niedrig-kardinale Prometheus-Metriken um:
 *
 * 1. `EIGENSCHUTZ_PSA_PROPAGATION_DURATION` (Histogram) — End-to-End-
 *    Latenz `assess_started → all_banners_delivered` (NFR-P1: ≤ 90 s).
 *    Bucket-Label `abschnitt_count_bucket` faltet `abschnittCount` in
 *    vier Klassen (`'1'`, `'2-3'`, `'4-8'`, `'9+'`), um Kardinalität
 *    deterministisch zu deckeln.
 * 2. `EIGENSCHUTZ_QUITTUNG_LATENCY` (Histogram) — Latenz
 *    `all_banners_delivered → psa_quittung_abgegeben` (bzw. die kanonische
 *    Variante `quittung_abgegeben` aus Architektur §B9). Label
 *    `einheit_id_bucket` faltet die Einheits-Information auf
 *    `'present' | 'absent'`.
 * 3. `EIGENSCHUTZ_BLIND_ACK_TOTAL` (Counter) — Coaching-Signal pro
 *    Einheit (Quittung < 2 s nach Banner-Öffnen).
 *
 * **Defense-in-Depth gegen Histogram-Vergiftung:** Fehlende oder
 * nicht-finite Metadata-Felder führen zu `silent skip` (kein `observe`),
 * NIEMALS zu einem `NaN`-Observe — sonst wären Histogram-Quantile auf
 * Lebenszeit korrupt.
 *
 * @remarks Story 3.11 AC4 (Tasks 4.3 + 4.4)
 * @module infrastructure/eigenschutz/telemetry
 */
import { Inject, Injectable } from '@nestjs/common';
import type { Counter, Histogram } from 'prom-client';
import type { EigenschutzTelemetryEventInput } from '@/application/eigenschutz/schemas/telemetry-event.schema';
import { METRICS } from '@/infrastructure/di-tokens';

/**
 * Metadata-Cell-Typ aus dem Shared-Schema (scalar-only, ohne nested
 * objects/arrays). `Record<string, ...>` mit Union-Typ — wir lesen
 * defensive über `unknown`-Narrowing, weil das Z-Schema `optional()`
 * ist und Werte zur Laufzeit schon getypt aber keine Garantie gegen
 * `undefined`-Lookups bieten.
 */
type MetadataCell = EigenschutzTelemetryEventInput['metadata'];

/**
 * Liest einen `number`-Wert aus der Metadata-Map. Liefert `null`
 * für `undefined`, falsche Typen ODER nicht-finite Werte (`NaN`,
 * `±Infinity`) — letzteres schützt Histogramm-Quantile vor Vergiftung.
 */
function numericMeta(metadata: MetadataCell, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Liest eine nicht-negative `elapsed-ms`-Dauer aus der Metadata. Negative
 * Werte (Client-Clock-Skew, DST-Sprung) würden die Histogram-Quantile
 * dauerhaft verzerren — Prometheus akzeptiert sie technisch, aber
 * `_sum/_count` verlieren ihre monotone Latenz-Semantik. Silent-skip ist
 * die korrekte Antwort.
 */
function nonNegativeNumericMeta(metadata: MetadataCell, key: string): number | null {
  const value = numericMeta(metadata, key);
  return value !== null && value >= 0 ? value : null;
}

/**
 * Maximale Länge eines Prometheus-Labels für `einheit_id` (counter
 * `eigenschutz_blind_ack_total`). Cap pro Label-Wert begrenzt die Time-
 * Series-Kardinalität deterministisch — selbst wenn ein Client einen
 * 80-Zeichen-Wert in `metadata.einheitIdCandidate` schickt, wird er auf
 * 32 Zeichen gekürzt. CUID2-IDs (24–32 Zeichen) bleiben unverändert.
 */
const EINHEIT_ID_LABEL_CAP = 32;

/**
 * Liest einen nicht-leeren `string`-Wert aus der Metadata-Map. Liefert
 * `null` für `undefined`, falsche Typen ODER Leerstrings.
 */
function stringMeta(metadata: MetadataCell, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Faltet `abschnittCount` deterministisch in vier Klassen. Kardinalität
 * der Label-Achse bleibt damit konstant — kritisch für Prometheus-
 * Storage und Grafana-Aggregationen.
 *
 * Klassen:
 * - `'1'`: Einzel-Abschnitt (typisch für Punkt-Einsätze)
 * - `'2-3'`: Klein-Lage
 * - `'4-8'`: Mittel-Lage
 * - `'9+'`: Groß-Lage / MANV
 */
function bucketAbschnittCount(count: number): string {
  if (count <= 1) return '1';
  if (count <= 3) return '2-3';
  if (count <= 8) return '4-8';
  return '9+';
}

@Injectable()
export class PrometheusEigenschutzCollector {
  constructor(
    @Inject(METRICS.EIGENSCHUTZ_PSA_PROPAGATION_DURATION)
    private readonly propagationDuration: Histogram<'abschnitt_count_bucket'>,
    @Inject(METRICS.EIGENSCHUTZ_QUITTUNG_LATENCY)
    private readonly quittungLatency: Histogram<'einheit_id_bucket'>,
    @Inject(METRICS.EIGENSCHUTZ_BLIND_ACK_TOTAL)
    private readonly blindAckTotal: Counter<'einheit_id'>,
  ) {}

  /**
   * Verarbeitet ein einzelnes Telemetrie-Event und beobachtet — falls
   * passend — die zugehörige Prometheus-Metrik. Andere Event-Namen
   * (`'assess_started'`, `'luecke_gemeldet'`, …) werden bewusst still
   * übergangen.
   */
  observe(event: EigenschutzTelemetryEventInput): void {
    const { eventName, metadata, abschnittCount } = event;

    switch (eventName) {
      case 'all_banners_delivered': {
        const elapsedMs = nonNegativeNumericMeta(metadata, 'elapsedMs');
        if (elapsedMs === null) return;
        if (!Number.isFinite(abschnittCount)) return;
        this.propagationDuration.observe({ abschnitt_count_bucket: bucketAbschnittCount(abschnittCount) }, elapsedMs / 1000);
        return;
      }
      case 'psa_quittung_abgegeben':
      case 'quittung_abgegeben': {
        // Defensive: Architektur §B9 listet `quittung_abgegeben`, FE-Queue
        // emittiert `psa_quittung_abgegeben` — beide Spellings müssen
        // identische Latenz-Histogramme produzieren.
        const elapsedFromBannerMs = nonNegativeNumericMeta(metadata, 'elapsedFromBannerMs');
        if (elapsedFromBannerMs === null) return;
        const einheitPresent = stringMeta(metadata, 'einheitIdCandidate') !== null;
        this.quittungLatency.observe({ einheit_id_bucket: einheitPresent ? 'present' : 'absent' }, elapsedFromBannerMs / 1000);
        return;
      }
      case 'blind_ack': {
        const einheitId = stringMeta(metadata, 'einheitIdCandidate');
        // Label-Längen-Cap schützt vor Time-Series-Explosion, falls ein
        // Client einen attacker-controlled 80-Zeichen-String schickt.
        const labelValue = einheitId === null ? 'unknown' : einheitId.slice(0, EINHEIT_ID_LABEL_CAP);
        this.blindAckTotal.inc({ einheit_id: labelValue });
        return;
      }
      default:
        // Andere Event-Namen (z. B. `'assess_started'`, `'luecke_gemeldet'`)
        // erzeugen keine Metriken-Observations — silent skip ist beabsichtigt.
        return;
    }
  }
}
