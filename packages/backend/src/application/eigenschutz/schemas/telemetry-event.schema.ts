import { z } from 'zod';

/**
 * Backend-Kopie des Eigenschutz-Telemetrie-Schemas (Story 3.11, FR21).
 *
 * **Warum eine Kopie statt Re-Use von `@bluelight-hub/shared/schemas`?**
 * Backend ist Stand Story 3.11 nicht ESM-migriert; der `package.json`-
 * `exports`-Map des shared-Pakets liefert nur ESM-Builds (`type: module`),
 * was Jest/SWC im CommonJS-Build des Backends nicht auflösen kann (siehe
 * `complete-setup.dto.ts`-Kommentar zum gleichen ESM-Migrations-TODO).
 *
 * **Single Source of Truth:** `packages/shared/src/schemas/eigenschutz/telemetry-event.schema.ts`.
 * Diese Datei ist eine **manuelle Spiegelung** und muss bei jeder Änderung
 * dort synchronisiert werden. Wird die ESM-Migration abgeschlossen, kann
 * dieses File ersatzlos entfernt und der Import auf das shared-Schema
 * umgestellt werden.
 */
export const eigenschutzTelemetryEventNameSchema = z.enum([
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
]);
export type EigenschutzTelemetryEventName = z.infer<typeof eigenschutzTelemetryEventNameSchema>;

export const eigenschutzTelemetryMetadataSchema = z.record(z.string().min(1).max(64), z.union([z.string().max(256), z.number(), z.boolean(), z.null()])).optional();

export const eigenschutzTelemetryEventSchema = z.object({
  eventName: eigenschutzTelemetryEventNameSchema,
  propagationGroupIdCandidate: z.string().min(1).max(80),
  abschnittCount: z.number().int().min(0).max(1024),
  userId: z.string().min(1).max(80),
  sessionId: z.string().min(1).max(80),
  clientTime: z.string().datetime({ offset: true }),
  metadata: eigenschutzTelemetryMetadataSchema,
});
export type EigenschutzTelemetryEventInput = z.infer<typeof eigenschutzTelemetryEventSchema>;

export const eigenschutzTelemetryBatchSchema = z.object({
  events: z.array(eigenschutzTelemetryEventSchema).min(1).max(50),
});
export type EigenschutzTelemetryBatchInput = z.infer<typeof eigenschutzTelemetryBatchSchema>;
