import {
  eigenschutzTelemetryBatchSchema,
  eigenschutzTelemetryEventNameSchema,
  eigenschutzTelemetryEventSchema,
  eigenschutzTelemetryMetadataSchema,
} from '@/application/eigenschutz/schemas/telemetry-event.schema';
import { TELEMETRY_EVENT_NAMES } from '@/application/eigenschutz/dto/telemetry-event.dto';
// Relativer Pfad statt `@bluelight-hub/shared/...` — Backend ist nicht ESM-
// migriert (Story 3.11 Pivot-Anker), aber SWC kann die TS-Quelle direkt
// transpilieren. Sobald die ESM-Migration durch ist, kann der relative Pfad
// auf den Package-Import umgestellt werden.
import { eigenschutzTelemetryEventNameSchema as sharedEventNameSchema } from '../../../../../shared/src/schemas/eigenschutz/telemetry-event.schema';

/**
 * Round-Trip-Tests für das Story-3.11-Telemetrie-Event-Schema (AC1).
 *
 * Testen die Wire-Format-Verträge zwischen Frontend-Queue (`telemetry-queue.ts`)
 * und Backend-Endpoint (`TelemetryIngestService`). Kein Service- oder DB-Bezug.
 */
describe('eigenschutzTelemetryEventSchema (Story 3.11 AC1)', () => {
  const validBaseEvent = {
    eventName: 'all_banners_delivered' as const,
    propagationGroupIdCandidate: 'candidate-einheitA-abc123',
    abschnittCount: 3,
    userId: 'user-cuid-1',
    sessionId: 'session-uuid-1',
    clientTime: '2026-05-05T10:30:00.000+02:00',
  };

  describe('eigenschutzTelemetryEventNameSchema', () => {
    it.each([
      'assess_started',
      'assess_completed',
      'assess_aborted',
      'cbrn_announced',
      'cbrn_acknowledged',
      'all_banners_delivered',
      'psa_quittung_abgegeben',
      'quittung_abgegeben',
      'blind_ack',
      'luecke_gemeldet',
      'quittung_ueberfaellig',
    ])('akzeptiert valide Event-Namen: %s', (name) => {
      expect(eigenschutzTelemetryEventNameSchema.safeParse(name).success).toBe(true);
    });

    it('lehnt unbekannte Event-Namen ab', () => {
      const result = eigenschutzTelemetryEventNameSchema.safeParse('assess_unknown');
      expect(result.success).toBe(false);
    });
  });

  describe('propagationGroupIdCandidate Längen-Cap', () => {
    it('akzeptiert 1 Zeichen', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, propagationGroupIdCandidate: 'x' }).success).toBe(true);
    });

    it('akzeptiert 80 Zeichen', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, propagationGroupIdCandidate: 'a'.repeat(80) }).success).toBe(true);
    });

    it('lehnt 81 Zeichen ab', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, propagationGroupIdCandidate: 'a'.repeat(81) }).success).toBe(false);
    });

    it('lehnt leeren String ab (min 1)', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, propagationGroupIdCandidate: '' }).success).toBe(false);
    });
  });

  describe('abschnittCount Range', () => {
    it.each([0, 1, 1024])('akzeptiert valide Werte: %i', (n) => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, abschnittCount: n }).success).toBe(true);
    });

    it('lehnt negative Werte ab', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, abschnittCount: -1 }).success).toBe(false);
    });

    it('lehnt > 1024 ab', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, abschnittCount: 1025 }).success).toBe(false);
    });

    it('lehnt Float-Werte ab', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, abschnittCount: 1.5 }).success).toBe(false);
    });
  });

  describe('clientTime ISO-8601 mit Offset', () => {
    it('akzeptiert ISO-8601 mit +02:00-Offset', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, clientTime: '2026-05-05T10:30:00.000+02:00' }).success).toBe(true);
    });

    it('akzeptiert UTC-Z-Suffix', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, clientTime: '2026-05-05T10:30:00.000Z' }).success).toBe(true);
    });

    it('lehnt ISO-8601 ohne Offset ab', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, clientTime: '2026-05-05T10:30:00.000' }).success).toBe(false);
    });

    it('lehnt nicht-ISO-Strings ab', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, clientTime: '2026-05-05 10:30:00' }).success).toBe(false);
    });
  });

  describe('metadata scalar-only Constraint', () => {
    it('akzeptiert undefined (optional)', () => {
      expect(eigenschutzTelemetryEventSchema.safeParse({ ...validBaseEvent, metadata: undefined }).success).toBe(true);
    });

    it('akzeptiert flache scalar-only-Map', () => {
      const result = eigenschutzTelemetryEventSchema.safeParse({
        ...validBaseEvent,
        metadata: { einheitId: 'cuid', meldungLength: 42, isCritical: true, comment: null },
      });
      expect(result.success).toBe(true);
    });

    it('lehnt nested objects ab', () => {
      const result = eigenschutzTelemetryEventSchema.safeParse({
        ...validBaseEvent,
        metadata: { nested: { a: 1 } },
      });
      expect(result.success).toBe(false);
    });

    it('lehnt arrays als Werte ab', () => {
      const result = eigenschutzTelemetryEventSchema.safeParse({
        ...validBaseEvent,
        metadata: { values: [1, 2, 3] },
      });
      expect(result.success).toBe(false);
    });

    it('lehnt zu lange string-Werte ab (> 256 Zeichen)', () => {
      const result = eigenschutzTelemetryEventSchema.safeParse({
        ...validBaseEvent,
        metadata: { x: 'a'.repeat(257) },
      });
      expect(result.success).toBe(false);
    });

    it('lehnt zu lange Keys ab (> 64 Zeichen)', () => {
      const result = eigenschutzTelemetryMetadataSchema.safeParse({
        [`a`.repeat(65)]: 'value',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('eigenschutzTelemetryBatchSchema (Cap 50)', () => {
    const buildValidEvent = (i: number) => ({ ...validBaseEvent, propagationGroupIdCandidate: `candidate-${i}` });

    it('akzeptiert 1 Event (min 1)', () => {
      expect(eigenschutzTelemetryBatchSchema.safeParse({ events: [buildValidEvent(1)] }).success).toBe(true);
    });

    it('akzeptiert 50 Events (max 50)', () => {
      const events = Array.from({ length: 50 }, (_, i) => buildValidEvent(i));
      expect(eigenschutzTelemetryBatchSchema.safeParse({ events }).success).toBe(true);
    });

    it('lehnt 0 Events ab (Array.min)', () => {
      expect(eigenschutzTelemetryBatchSchema.safeParse({ events: [] }).success).toBe(false);
    });

    it('lehnt 51 Events ab (Array.max)', () => {
      const events = Array.from({ length: 51 }, (_, i) => buildValidEvent(i));
      expect(eigenschutzTelemetryBatchSchema.safeParse({ events }).success).toBe(false);
    });
  });

  /**
   * 3-Wege-Drift-Sync (Story 3.11 — Code-Review-Patch). Die Event-Namen-Liste
   * existiert in drei Dateien (DTO `TELEMETRY_EVENT_NAMES`, Backend-Zod, Shared-
   * Zod) und MUSS überall gleich sein. Bevor Story 3.11 ESM-migriert ist, kann
   * das nicht über Imports erzwungen werden — diese Suite ersetzt den
   * Compile-Time-Check durch einen Test.
   */
  describe('Event-Namen-Liste — 3-Wege-Drift-Sync', () => {
    const CANONICAL_NAMES = [
      'assess_started',
      'assess_completed',
      'assess_aborted',
      'cbrn_announced',
      'cbrn_acknowledged',
      'all_banners_delivered',
      'psa_quittung_abgegeben',
      'quittung_abgegeben',
      'blind_ack',
      'luecke_gemeldet',
      'quittung_ueberfaellig',
    ];

    it('DTO TELEMETRY_EVENT_NAMES entspricht der kanonischen Liste', () => {
      expect([...TELEMETRY_EVENT_NAMES]).toEqual(CANONICAL_NAMES);
    });

    it('Backend-Zod-Enum entspricht der kanonischen Liste', () => {
      expect(eigenschutzTelemetryEventNameSchema.options).toEqual(CANONICAL_NAMES);
    });

    it('Shared-Zod-Enum entspricht der kanonischen Liste (Single-Source-of-Truth-Anker)', () => {
      expect(sharedEventNameSchema.options).toEqual(CANONICAL_NAMES);
    });
  });
});
