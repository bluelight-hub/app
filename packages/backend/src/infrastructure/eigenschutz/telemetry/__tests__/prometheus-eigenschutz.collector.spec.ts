import type { EigenschutzTelemetryEventInput } from '@/application/eigenschutz/schemas/telemetry-event.schema';
import { PrometheusEigenschutzCollector } from '../prometheus-eigenschutz.collector';

/**
 * Unit Tests für `PrometheusEigenschutzCollector` (Story 3.11 AC4 / Task 4.4).
 *
 * **Mocking-Strategie:**
 * - Histogramme: `{ observe: jest.fn() }` — direkter Spy.
 * - Counter: `{ inc: jest.fn() }` — direkter Spy.
 * - Direktes `new PrometheusEigenschutzCollector(...)`, kein NestJS-Context
 *   nötig: Die Klasse hat keine Side-Effects über die injizierten Mocks
 *   hinaus.
 *
 * **Defense-Tests:**
 * - Kein `observe(NaN/Infinity/...)` darf jemals ausgelöst werden — sonst
 *   wären Histogramm-Quantile auf Lebenszeit korrupt.
 * - `'quittung_abgegeben'` (Architektur-Kanonik) MUSS identisch zu
 *   `'psa_quittung_abgegeben'` (FE-Queue) verarbeitet werden.
 */
describe('PrometheusEigenschutzCollector', () => {
  let propagationDuration: { observe: jest.Mock };
  let quittungLatency: { observe: jest.Mock };
  let blindAckTotal: { inc: jest.Mock };
  let collector: PrometheusEigenschutzCollector;

  /** Helper: Baut ein vollständig gefülltes Event mit Default-Pflichtfeldern. */
  function buildEvent(overrides: Partial<EigenschutzTelemetryEventInput>): EigenschutzTelemetryEventInput {
    return {
      eventName: 'assess_started',
      propagationGroupIdCandidate: 'candidate-1',
      abschnittCount: 1,
      userId: 'user-1',
      sessionId: 'session-1',
      clientTime: '2026-05-04T12:00:00.000Z',
      metadata: undefined,
      ...overrides,
    };
  }

  beforeEach(() => {
    propagationDuration = { observe: jest.fn() };
    quittungLatency = { observe: jest.fn() };
    blindAckTotal = { inc: jest.fn() };
    collector = new PrometheusEigenschutzCollector(propagationDuration as never, quittungLatency as never, blindAckTotal as never);
  });

  describe('all_banners_delivered → propagationDuration', () => {
    it('beobachtet elapsedMs/1000 Sekunden mit korrektem abschnitt_count_bucket', () => {
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 1,
          metadata: { elapsedMs: 45000 },
        }),
      );

      expect(propagationDuration.observe).toHaveBeenCalledTimes(1);
      expect(propagationDuration.observe).toHaveBeenCalledWith({ abschnitt_count_bucket: '1' }, 45);
      expect(quittungLatency.observe).not.toHaveBeenCalled();
      expect(blindAckTotal.inc).not.toHaveBeenCalled();
    });

    it('skippt silent, wenn metadata.elapsedMs fehlt', () => {
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 5,
          metadata: { foo: 'bar' },
        }),
      );

      expect(propagationDuration.observe).not.toHaveBeenCalled();
    });

    it('skippt silent für nicht-finite elapsedMs (NaN, Infinity) — Histogramm-Schutz', () => {
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 2,
          metadata: { elapsedMs: Number.NaN },
        }),
      );
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 2,
          metadata: { elapsedMs: Number.POSITIVE_INFINITY },
        }),
      );
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 2,
          metadata: { elapsedMs: Number.NEGATIVE_INFINITY },
        }),
      );

      expect(propagationDuration.observe).not.toHaveBeenCalled();
    });

    it('skippt silent für negativ-finite elapsedMs (Code-Review-Patch — Clock-Skew-Defense)', () => {
      // Negative Werte sind technisch finit, würden Prometheus aber als
      // valide Histogramm-Observation mit verzerrtem _sum/_count erreichen.
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 2,
          metadata: { elapsedMs: -500 },
        }),
      );

      expect(propagationDuration.observe).not.toHaveBeenCalled();
    });

    it('skippt silent, wenn metadata komplett undefined ist', () => {
      collector.observe(
        buildEvent({
          eventName: 'all_banners_delivered',
          abschnittCount: 1,
          metadata: undefined,
        }),
      );

      expect(propagationDuration.observe).not.toHaveBeenCalled();
    });

    it('mappt abschnittCount korrekt in alle vier Buckets', () => {
      const cases: Array<{ count: number; bucket: string }> = [
        { count: 0, bucket: '1' },
        { count: 1, bucket: '1' },
        { count: 2, bucket: '2-3' },
        { count: 3, bucket: '2-3' },
        { count: 4, bucket: '4-8' },
        { count: 8, bucket: '4-8' },
        { count: 9, bucket: '9+' },
        { count: 100, bucket: '9+' },
      ];

      for (const { count, bucket } of cases) {
        propagationDuration.observe.mockClear();
        collector.observe(
          buildEvent({
            eventName: 'all_banners_delivered',
            abschnittCount: count,
            metadata: { elapsedMs: 1000 },
          }),
        );
        expect(propagationDuration.observe).toHaveBeenCalledWith({ abschnitt_count_bucket: bucket }, 1);
      }
    });
  });

  describe('psa_quittung_abgegeben / quittung_abgegeben → quittungLatency', () => {
    it('beobachtet elapsedFromBannerMs/1000 mit einheit_id_bucket="present", wenn einheitIdCandidate gesetzt ist', () => {
      collector.observe(
        buildEvent({
          eventName: 'psa_quittung_abgegeben',
          abschnittCount: 1,
          metadata: { elapsedFromBannerMs: 1500, einheitIdCandidate: 'cuid123' },
        }),
      );

      expect(quittungLatency.observe).toHaveBeenCalledTimes(1);
      expect(quittungLatency.observe).toHaveBeenCalledWith({ einheit_id_bucket: 'present' }, 1.5);
      expect(propagationDuration.observe).not.toHaveBeenCalled();
      expect(blindAckTotal.inc).not.toHaveBeenCalled();
    });

    it('verarbeitet "quittung_abgegeben" (Architektur-§B9-Kanonik) IDENTISCH zu "psa_quittung_abgegeben"', () => {
      collector.observe(
        buildEvent({
          eventName: 'quittung_abgegeben',
          abschnittCount: 1,
          metadata: { elapsedFromBannerMs: 1500, einheitIdCandidate: 'cuid123' },
        }),
      );

      expect(quittungLatency.observe).toHaveBeenCalledTimes(1);
      expect(quittungLatency.observe).toHaveBeenCalledWith({ einheit_id_bucket: 'present' }, 1.5);
    });

    it('setzt einheit_id_bucket="absent", wenn einheitIdCandidate fehlt', () => {
      collector.observe(
        buildEvent({
          eventName: 'psa_quittung_abgegeben',
          abschnittCount: 1,
          metadata: { elapsedFromBannerMs: 800 },
        }),
      );

      expect(quittungLatency.observe).toHaveBeenCalledWith({ einheit_id_bucket: 'absent' }, 0.8);
    });

    it('skippt silent, wenn metadata.elapsedFromBannerMs fehlt', () => {
      collector.observe(
        buildEvent({
          eventName: 'psa_quittung_abgegeben',
          abschnittCount: 1,
          metadata: { einheitIdCandidate: 'cuid123' },
        }),
      );

      expect(quittungLatency.observe).not.toHaveBeenCalled();
    });

    it('skippt silent für nicht-finite elapsedFromBannerMs', () => {
      collector.observe(
        buildEvent({
          eventName: 'quittung_abgegeben',
          abschnittCount: 1,
          metadata: { elapsedFromBannerMs: Number.NaN, einheitIdCandidate: 'cuid' },
        }),
      );

      expect(quittungLatency.observe).not.toHaveBeenCalled();
    });

    it('skippt silent für negativ-finite elapsedFromBannerMs (Code-Review-Patch — DST/Clock-Skew-Defense)', () => {
      collector.observe(
        buildEvent({
          eventName: 'psa_quittung_abgegeben',
          abschnittCount: 1,
          metadata: { elapsedFromBannerMs: -1, einheitIdCandidate: 'cuid' },
        }),
      );

      expect(quittungLatency.observe).not.toHaveBeenCalled();
    });
  });

  describe('blind_ack → blindAckTotal', () => {
    it('inkrementiert mit einheit_id aus metadata.einheitIdCandidate', () => {
      collector.observe(
        buildEvent({
          eventName: 'blind_ack',
          metadata: { einheitIdCandidate: 'cuid' },
        }),
      );

      expect(blindAckTotal.inc).toHaveBeenCalledTimes(1);
      expect(blindAckTotal.inc).toHaveBeenCalledWith({ einheit_id: 'cuid' });
      expect(propagationDuration.observe).not.toHaveBeenCalled();
      expect(quittungLatency.observe).not.toHaveBeenCalled();
    });

    it('inkrementiert mit einheit_id="unknown", wenn einheitIdCandidate fehlt', () => {
      collector.observe(
        buildEvent({
          eventName: 'blind_ack',
          metadata: { foo: 'bar' },
        }),
      );

      expect(blindAckTotal.inc).toHaveBeenCalledWith({ einheit_id: 'unknown' });
    });

    it('inkrementiert mit einheit_id="unknown" und wirft NICHT, wenn metadata komplett undefined ist', () => {
      expect(() =>
        collector.observe(
          buildEvent({
            eventName: 'blind_ack',
            metadata: undefined,
          }),
        ),
      ).not.toThrow();

      expect(blindAckTotal.inc).toHaveBeenCalledWith({ einheit_id: 'unknown' });
    });

    it('behandelt einen Leerstring-einheitIdCandidate als "unknown"', () => {
      collector.observe(
        buildEvent({
          eventName: 'blind_ack',
          metadata: { einheitIdCandidate: '' },
        }),
      );

      expect(blindAckTotal.inc).toHaveBeenCalledWith({ einheit_id: 'unknown' });
    });

    it('kappt einen attacker-controlled einheitIdCandidate auf 32 Zeichen (Cardinality-Defense)', () => {
      // Code-Review-Patch: ohne Cap könnte ein böswilliger Client einen
      // 80-Zeichen-Wert in `metadata.einheitIdCandidate` schicken und damit
      // die Time-Series-Kardinalität von `eigenschutz_blind_ack_total`
      // explodieren lassen. CUID2-IDs sind ≤ 32 Zeichen, daher sicher.
      const attackerLabel = 'X'.repeat(80);
      collector.observe(
        buildEvent({
          eventName: 'blind_ack',
          metadata: { einheitIdCandidate: attackerLabel },
        }),
      );

      expect(blindAckTotal.inc).toHaveBeenCalledWith({ einheit_id: 'X'.repeat(32) });
    });
  });

  describe('Andere Event-Namen → silent skip', () => {
    it('beobachtet keine der drei Metriken für "assess_started"', () => {
      collector.observe(
        buildEvent({
          eventName: 'assess_started',
          metadata: { elapsedMs: 999 },
        }),
      );

      expect(propagationDuration.observe).not.toHaveBeenCalled();
      expect(quittungLatency.observe).not.toHaveBeenCalled();
      expect(blindAckTotal.inc).not.toHaveBeenCalled();
    });

    it('beobachtet keine der drei Metriken für "luecke_gemeldet"', () => {
      collector.observe(
        buildEvent({
          eventName: 'luecke_gemeldet',
          metadata: { elapsedFromBannerMs: 5000, einheitIdCandidate: 'cuid' },
        }),
      );

      expect(propagationDuration.observe).not.toHaveBeenCalled();
      expect(quittungLatency.observe).not.toHaveBeenCalled();
      expect(blindAckTotal.inc).not.toHaveBeenCalled();
    });
  });
});
