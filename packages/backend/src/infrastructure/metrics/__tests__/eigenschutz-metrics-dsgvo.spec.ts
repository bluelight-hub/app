import { Test } from '@nestjs/testing';
import * as client from 'prom-client';
import { eigenschutzTelemetryEventSchema, type EigenschutzTelemetryEventInput } from '@/application/eigenschutz/schemas/telemetry-event.schema';
import { METRICS } from '@/infrastructure/di-tokens';
import { PrometheusEigenschutzCollector } from '@/infrastructure/eigenschutz/telemetry/prometheus-eigenschutz.collector';
import { MetricsModule } from '../metrics.module';

/**
 * DSGVO-Label-Inventar-Spec für die drei Eigenschutz-Prometheus-Metriken
 * (Story 7.9 AC8 / Task T8).
 *
 * **Zweck:**
 * Verifiziert strukturell, dass die in `metrics.module.ts` registrierten
 * Eigenschutz-Metriken ausschließlich DSGVO-konforme, niedrig-kardinale
 * Labels führen — und dass der `PrometheusEigenschutzCollector` keine
 * verbotenen Metadata-Keys (z. B. `userId`, `sessionId`, `payload`) als
 * Label-Werte durchreicht. Damit ist die DSGVO-Pflicht aus Epic-AC3
 * strukturell abgesichert: Drift zwischen Schema und Implementation würde
 * hier sofort rot werden.
 *
 * **Aufbau:**
 * - **Sektion A — Provider-Inventar:** Lädt das `MetricsModule` via
 *   `Test.createTestingModule({ imports: [MetricsModule] }).compile()` und
 *   inspiziert die `labelNames`-Sets der drei Eigenschutz-Provider-
 *   Instanzen (Allowlist + Negativ-Liste, inkl. Registry-Name-Verify).
 * - **Sektion B — Collector-Sanity:** Instanziiert
 *   `PrometheusEigenschutzCollector` mit gemockten Histogram/Counter und
 *   füttert synthetische Events mit verbotenen Metadata-Keys; verifiziert,
 *   dass die emittierten Label-Objekte nur die Allowlist-Schlüssel
 *   enthalten — inklusive Bucket-Boundaries, Defensive-Guards und
 *   Längen-Cap für `einheit_id`.
 *
 * **prom-client-Hinweis:**
 * `Histogram`/`Counter` exposen `labelNames` als public Property (siehe
 * prom-client 15-Type-Definitionen). Cast auf `any` ist akzeptabel, weil
 * das Feld konventionell vorhanden ist.
 *
 * **Side-Effects / Registry-Lifecycle:**
 * `client.collectDefaultMetrics()` läuft beim Module-Compile in der
 * Registry-Provider-Factory. `MetricsModule` benutzt die globale
 * `client.register`-Singleton — eine private `Registry`-Instanz pro
 * Spec würde Modul-Modifikationen erfordern (Pivot-Anker Story 7.9
 * verbietet das). Stattdessen wird gezielt jede Eigenschutz-Metrik
 * vor dem Module-Compile via `removeSingleMetric()` deregistriert, um
 * Duplicate-Registrierungen zu verhindern. Globales `register.clear()`
 * wird bewusst vermieden, weil andere Specs im selben Jest-Worker
 * darauf angewiesen sein könnten.
 */
describe('Eigenschutz-Metriken DSGVO-Label-Inventar (Story 7.9 AC8)', () => {
  /**
   * Labels, die NIEMALS in den drei Eigenschutz-Metriken auftauchen dürfen.
   * Ergibt sich aus Story 7.9 AC8 + Architektur §B9 (DSGVO-Pseudonymisierung).
   * Enthält sowohl CamelCase- als auch snake_case-Varianten, weil
   * Prometheus-Labels konventionell snake_case sind und die Metadata-
   * Keys aus dem TS-Schema CamelCase sind — beide Varianten müssen
   * abgesichert werden.
   */
  const FORBIDDEN_LABEL_NAMES = [
    'userId',
    'user_id',
    'sessionId',
    'session_id',
    'propagationGroupIdCandidate',
    'propagationGroupId',
    'propagation_group_id',
    'einsatzId',
    'einsatz_id',
    'clientTime',
    'client_time',
    'serverTime',
    'server_time',
    'payload',
    'email',
    'name',
    'funkrufname',
  ] as const;

  // ─── Sektion A: Provider-Inventar-Asserts ──────────────────────────────
  describe('Sektion A: MetricsModule-Provider-Inventar', () => {
    let psaPropagationDuration: client.Histogram<string>;
    let quittungLatency: client.Histogram<string>;
    let blindAckTotal: client.Counter<string>;

    beforeAll(async () => {
      // Gezielte Deregistrierung der Eigenschutz-Metriken vor dem
      // Module-Compile: verhindert Duplicate-Registrierungen, falls eine
      // andere Spec im gleichen Jest-Worker bereits dasselbe Modul
      // kompiliert hat. `register.clear()` wäre zu breit — würde andere
      // Specs (z. B. HTTP-Histogramme) beschädigen.
      const eigenschutzMetricNames = ['eigenschutz_psa_propagation_duration_seconds', 'eigenschutz_quittung_latency_seconds', 'eigenschutz_blind_ack_total'];
      for (const metricName of eigenschutzMetricNames) {
        if (client.register.getSingleMetric(metricName)) {
          client.register.removeSingleMetric(metricName);
        }
      }

      const moduleRef = await Test.createTestingModule({
        imports: [MetricsModule],
      }).compile();

      psaPropagationDuration = moduleRef.get<client.Histogram<string>>(METRICS.EIGENSCHUTZ_PSA_PROPAGATION_DURATION);
      quittungLatency = moduleRef.get<client.Histogram<string>>(METRICS.EIGENSCHUTZ_QUITTUNG_LATENCY);
      blindAckTotal = moduleRef.get<client.Counter<string>>(METRICS.EIGENSCHUTZ_BLIND_ACK_TOTAL);
    });

    it('registriert `eigenschutz_psa_propagation_duration_seconds` als Histogram und in der Registry', () => {
      expect(psaPropagationDuration).toBeDefined();
      // Duck-typing: jede Histogram-Instanz exposed `observe()`.
      expect(typeof (psaPropagationDuration as unknown as { observe?: unknown }).observe).toBe('function');
      expect(psaPropagationDuration).toBeInstanceOf(client.Histogram);
      // Registry-Name-Assert: fängt Provider-Typos im Metrik-Namen ab.
      expect(client.register.getSingleMetric('eigenschutz_psa_propagation_duration_seconds')).toBeDefined();
    });

    it('registriert `eigenschutz_quittung_latency_seconds` als Histogram und in der Registry', () => {
      expect(quittungLatency).toBeDefined();
      expect(typeof (quittungLatency as unknown as { observe?: unknown }).observe).toBe('function');
      expect(quittungLatency).toBeInstanceOf(client.Histogram);
      expect(client.register.getSingleMetric('eigenschutz_quittung_latency_seconds')).toBeDefined();
    });

    it('registriert `eigenschutz_blind_ack_total` als Counter und in der Registry', () => {
      expect(blindAckTotal).toBeDefined();
      expect(typeof (blindAckTotal as unknown as { inc?: unknown }).inc).toBe('function');
      expect(blindAckTotal).toBeInstanceOf(client.Counter);
      expect(client.register.getSingleMetric('eigenschutz_blind_ack_total')).toBeDefined();
    });

    it('exponiert für `psa_propagation_duration` ausschließlich `abschnitt_count_bucket` als Label', () => {
      const labelNames = (psaPropagationDuration as unknown as { labelNames: ReadonlyArray<string> }).labelNames;
      expect(new Set(labelNames)).toEqual(new Set(['abschnitt_count_bucket']));
    });

    it('exponiert für `quittung_latency` ausschließlich `einheit_id_bucket` als Label', () => {
      const labelNames = (quittungLatency as unknown as { labelNames: ReadonlyArray<string> }).labelNames;
      expect(new Set(labelNames)).toEqual(new Set(['einheit_id_bucket']));
    });

    it('exponiert für `blind_ack_total` ausschließlich `einheit_id` als Label', () => {
      const labelNames = (blindAckTotal as unknown as { labelNames: ReadonlyArray<string> }).labelNames;
      expect(new Set(labelNames)).toEqual(new Set(['einheit_id']));
    });

    it('führt KEINES der verbotenen Labels in irgendeiner der drei Eigenschutz-Metriken', () => {
      const allLabelNames = [
        ...(psaPropagationDuration as unknown as { labelNames: ReadonlyArray<string> }).labelNames,
        ...(quittungLatency as unknown as { labelNames: ReadonlyArray<string> }).labelNames,
        ...(blindAckTotal as unknown as { labelNames: ReadonlyArray<string> }).labelNames,
      ];

      for (const forbidden of FORBIDDEN_LABEL_NAMES) {
        expect(allLabelNames).not.toContain(forbidden);
      }
    });
  });

  // ─── Sektion B: Collector-Sanity-Check ─────────────────────────────────
  describe('Sektion B: PrometheusEigenschutzCollector reicht keine verbotenen Metadata-Keys durch', () => {
    let propagationDuration: { observe: jest.Mock };
    let quittungLatency: { observe: jest.Mock };
    let blindAckTotal: { inc: jest.Mock };
    let collector: PrometheusEigenschutzCollector;

    /**
     * Baut ein synthetisches Event, das ALLE verbotenen Felder als
     * Metadata-Keys mitführt — die Collector-Implementation MUSS diese
     * Keys ausnahmslos verwerfen. Das Roh-Objekt wird zusätzlich durch
     * `eigenschutzTelemetryEventSchema.parse()` geroutet, damit der Test
     * den realen End-to-End-Validation-Path nachstellt (P7: Drift
     * zwischen Schema und Test-Fixture fällt sofort auf).
     */
    function buildPoisonedEvent(overrides: Partial<EigenschutzTelemetryEventInput>): EigenschutzTelemetryEventInput {
      const rawObject = {
        eventName: 'blind_ack',
        propagationGroupIdCandidate: 'group-evil',
        abschnittCount: 1,
        userId: 'user-evil',
        sessionId: 'session-evil',
        clientTime: '2026-05-11T12:00:00.000Z',
        metadata: {
          // Verbotene Keys — dürfen NIE als Label-Wert auftauchen.
          userId: 'leaked-user',
          sessionId: 'leaked-session',
          payload: 'leaked-payload',
          email: 'leaked@example.com',
          name: 'leaked-name',
          funkrufname: 'leaked-funkrufname',
          // Erlaubte Keys, die der Collector verarbeitet.
          einheitIdCandidate: 'einheit-1',
          elapsedMs: 45000,
          elapsedFromBannerMs: 1500,
        },
        ...overrides,
      };
      return eigenschutzTelemetryEventSchema.parse(rawObject);
    }

    beforeEach(() => {
      propagationDuration = { observe: jest.fn() };
      quittungLatency = { observe: jest.fn() };
      blindAckTotal = { inc: jest.fn() };
      collector = new PrometheusEigenschutzCollector(propagationDuration as never, quittungLatency as never, blindAckTotal as never);
    });

    it('blind_ack: ruft `inc` ausschließlich mit Label `einheit_id` auf und ohne zweites Value-Argument', () => {
      collector.observe(buildPoisonedEvent({ eventName: 'blind_ack' }));

      expect(blindAckTotal.inc).toHaveBeenCalledTimes(1);
      // Genau ein Argument (kein numerisches `value`), Label-Wert ist die ID.
      expect(blindAckTotal.inc.mock.calls[0]).toEqual([{ einheit_id: 'einheit-1' }]);
      const labelArg = blindAckTotal.inc.mock.calls[0][0] as Record<string, unknown>;
      expect(Object.keys(labelArg).sort()).toEqual(['einheit_id']);
      expect(labelArg).toEqual({ einheit_id: 'einheit-1' });
    });

    it('all_banners_delivered: ruft `observe` auf propagationDuration mit `abschnitt_count_bucket: "1"` und 45 s auf', () => {
      collector.observe(buildPoisonedEvent({ eventName: 'all_banners_delivered' }));

      expect(propagationDuration.observe).toHaveBeenCalledTimes(1);
      const [labelArg, observedValue] = propagationDuration.observe.mock.calls[0] as [Record<string, unknown>, number];
      expect(Object.keys(labelArg).sort()).toEqual(['abschnitt_count_bucket']);
      // `abschnittCount: 1` → Bucket `'1'`; `elapsedMs: 45000` → 45 Sekunden.
      expect(labelArg).toEqual({ abschnitt_count_bucket: '1' });
      expect(observedValue).toBe(45);
    });

    it('psa_quittung_abgegeben: ruft `observe` auf quittungLatency mit `einheit_id_bucket: "present"` und 1.5 s auf', () => {
      collector.observe(buildPoisonedEvent({ eventName: 'psa_quittung_abgegeben' }));

      expect(quittungLatency.observe).toHaveBeenCalledTimes(1);
      const [labelArg, observedValue] = quittungLatency.observe.mock.calls[0] as [Record<string, unknown>, number];
      expect(Object.keys(labelArg).sort()).toEqual(['einheit_id_bucket']);
      // `einheitIdCandidate: 'einheit-1'` → Bucket `'present'`; `elapsedFromBannerMs: 1500` → 1.5 s.
      expect(labelArg).toEqual({ einheit_id_bucket: 'present' });
      expect(observedValue).toBe(1.5);
    });

    it('quittung_abgegeben (Architektur-§B9-Kanonik): identisches Verhalten — nur `einheit_id_bucket: "present"` mit 1.5 s', () => {
      collector.observe(buildPoisonedEvent({ eventName: 'quittung_abgegeben' }));

      expect(quittungLatency.observe).toHaveBeenCalledTimes(1);
      const [labelArg, observedValue] = quittungLatency.observe.mock.calls[0] as [Record<string, unknown>, number];
      expect(Object.keys(labelArg).sort()).toEqual(['einheit_id_bucket']);
      expect(labelArg).toEqual({ einheit_id_bucket: 'present' });
      expect(observedValue).toBe(1.5);
    });

    // ─── Bucket-Boundary-Tests (P3) ─────────────────────────────────────
    describe('bucketAbschnittCount: deckelt Kardinalität deterministisch auf vier Klassen', () => {
      // Klassen aus prometheus-eigenschutz.collector.ts §bucketAbschnittCount:
      //   count <= 1 → '1';  <= 3 → '2-3';  <= 8 → '4-8';  > 8 → '9+'.
      it.each<[number, string]>([
        [0, '1'],
        [1, '1'],
        [2, '2-3'],
        [3, '2-3'],
        [4, '4-8'],
        [8, '4-8'],
        [9, '9+'],
        [100, '9+'],
      ])('abschnittCount=%i ergibt Bucket-Label `%s`', (count, expectedBucket) => {
        collector.observe(
          buildPoisonedEvent({
            eventName: 'all_banners_delivered',
            abschnittCount: count,
          }),
        );

        expect(propagationDuration.observe).toHaveBeenCalledTimes(1);
        const labelArg = propagationDuration.observe.mock.calls[0][0] as Record<string, unknown>;
        expect(labelArg).toEqual({ abschnitt_count_bucket: expectedBucket });
      });
    });

    // ─── Defensive Guards (P4) ──────────────────────────────────────────
    describe('Defensive Guards: schützt Histogramme vor NaN-/negativ-Vergiftung', () => {
      it('NaN als abschnittCount → propagationDuration.observe wird NICHT aufgerufen', () => {
        // Zod blockiert NaN — wir umgehen den Schema-Parse bewusst über
        // einen Typ-Cast, weil der Collector defensiv gegen Drift aus
        // anderen Quellen (z. B. zukünftige Schema-Lockerung) absichern
        // muss. Das ist genau der Pfad, den `Number.isFinite(abschnittCount)`
        // im Collector abdeckt.
        const eventWithNaN = {
          eventName: 'all_banners_delivered' as const,
          propagationGroupIdCandidate: 'group-x',
          abschnittCount: Number.NaN,
          userId: 'user-x',
          sessionId: 'session-x',
          clientTime: '2026-05-11T12:00:00.000Z',
          metadata: { elapsedMs: 45000 },
        } as unknown as EigenschutzTelemetryEventInput;

        collector.observe(eventWithNaN);

        expect(propagationDuration.observe).not.toHaveBeenCalled();
        expect(quittungLatency.observe).not.toHaveBeenCalled();
        expect(blindAckTotal.inc).not.toHaveBeenCalled();
      });

      it('elapsedMs: -1 für all_banners_delivered → kein observe', () => {
        collector.observe(
          buildPoisonedEvent({
            eventName: 'all_banners_delivered',
            metadata: { elapsedMs: -1 },
          }),
        );

        expect(propagationDuration.observe).not.toHaveBeenCalled();
      });

      it('elapsedFromBannerMs: -1 für psa_quittung_abgegeben → kein observe', () => {
        collector.observe(
          buildPoisonedEvent({
            eventName: 'psa_quittung_abgegeben',
            metadata: { elapsedFromBannerMs: -1 },
          }),
        );

        expect(quittungLatency.observe).not.toHaveBeenCalled();
      });

      it('assess_started Event → ZERO Calls auf allen drei Metric-Mocks', () => {
        collector.observe(buildPoisonedEvent({ eventName: 'assess_started' }));

        expect(propagationDuration.observe).not.toHaveBeenCalled();
        expect(quittungLatency.observe).not.toHaveBeenCalled();
        expect(blindAckTotal.inc).not.toHaveBeenCalled();
      });

      it('luecke_gemeldet Event → ZERO Calls auf allen drei Metric-Mocks', () => {
        collector.observe(buildPoisonedEvent({ eventName: 'luecke_gemeldet' }));

        expect(propagationDuration.observe).not.toHaveBeenCalled();
        expect(quittungLatency.observe).not.toHaveBeenCalled();
        expect(blindAckTotal.inc).not.toHaveBeenCalled();
      });

      it('blind_ack ohne einheitIdCandidate → counter.inc mit `{ einheit_id: "unknown" }`', () => {
        collector.observe(
          buildPoisonedEvent({
            eventName: 'blind_ack',
            // Metadata ohne `einheitIdCandidate` — verbotene Keys bleiben drin.
            metadata: {
              userId: 'leaked-user',
              sessionId: 'leaked-session',
              payload: 'leaked-payload',
            },
          }),
        );

        expect(blindAckTotal.inc).toHaveBeenCalledTimes(1);
        expect(blindAckTotal.inc.mock.calls[0]).toEqual([{ einheit_id: 'unknown' }]);
      });
    });

    // ─── Label-Längen-Cap (P5) ──────────────────────────────────────────
    it('blind_ack: deckelt einheit_id auf 32 Zeichen (Schutz vor Time-Series-Explosion)', () => {
      const longEinheitId = 'a'.repeat(64);
      collector.observe(
        buildPoisonedEvent({
          eventName: 'blind_ack',
          metadata: { einheitIdCandidate: longEinheitId },
        }),
      );

      expect(blindAckTotal.inc).toHaveBeenCalledTimes(1);
      const labelArg = blindAckTotal.inc.mock.calls[0][0] as { einheit_id: string };
      expect(labelArg.einheit_id.length).toBe(32);
      expect(labelArg.einheit_id).toBe('a'.repeat(32));
    });
  });
});
