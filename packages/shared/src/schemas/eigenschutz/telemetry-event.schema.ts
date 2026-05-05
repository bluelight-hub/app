import { z } from 'zod';

/**
 * Eigenschutz-Telemetrie-Event-Schema (Story 3.11, FR21, Architektur §B9).
 *
 * Single Source of Truth für das Wire-Format zwischen Frontend
 * (`useEigenschutzTelemetry`-Flush) und Backend (`TelemetryIngestService`).
 *
 * **Event-Namen-Union:** Erbt 1:1 die FE-Union aus `lib/telemetry-queue.ts`
 * + den NEUEN `'blind_ack'`-Eintrag (Story 3.11 AC9). Architektur §B9 listet
 * nur 4 Namen — Backend akzeptiert die volle FE-Realität (`eventName VarChar(80)`
 * ist DB-seitig schemafrei, Drift-Schutz läuft hier auf der Schema-Ebene).
 *
 * **PII-Vertrag:** `userId` im Body ist eine Selbstauskunft — der Server
 * überschreibt den Wert serverseitig mit dem JWT-Caller (vgl. AC3 in
 * Story 3.11). Die `metadata`-Map ist scalar-only — keine nested objects,
 * keine arrays. Hält `payload JSONB` ≤ 4 KiB analog Story 3.9
 * `localPayload`-Cap.
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

/**
 * Metadata-Cell-Constraint: scalar-only — keine nested objects, keine arrays.
 * Backend trimmt im IngestService zusätzlich auf 4096 Byte UTF-8
 * (Defense-in-Depth, Story 3.11 AC3).
 */
export const eigenschutzTelemetryMetadataSchema = z.record(z.string().min(1).max(64), z.union([z.string().max(256), z.number(), z.boolean(), z.null()])).optional();

export const eigenschutzTelemetryEventSchema = z.object({
  eventName: eigenschutzTelemetryEventNameSchema,
  /**
   * Vom Sender-Drawer erzeugte `candidate-…`-ID VOR Submit ODER der echte
   * Server-`propagationGroupId` (CUID) NACH Submit. Wir validieren NUR
   * Längen-Cap (≤ 80 Zeichen), nicht das Format — der Client mischt beide
   * Welten je nach Workflow-Phase.
   */
  propagationGroupIdCandidate: z.string().min(1).max(80),
  abschnittCount: z.number().int().min(0).max(1024),
  userId: z.string().min(1).max(80),
  sessionId: z.string().min(1).max(80),
  clientTime: z.string().datetime({ offset: true }),
  metadata: eigenschutzTelemetryMetadataSchema,
});
export type EigenschutzTelemetryEventInput = z.infer<typeof eigenschutzTelemetryEventSchema>;

/**
 * Batch-Wrapper. **Cap = 50** (Architektur §B9-N1): der Frontend-Flush
 * triggert spätestens bei 50 Events; Backend lehnt > 50 Events mit 422 ab
 * (Defense-in-Depth gegen kompromittierte Clients).
 */
export const eigenschutzTelemetryBatchSchema = z.object({
  events: z.array(eigenschutzTelemetryEventSchema).min(1).max(50),
});
export type EigenschutzTelemetryBatchInput = z.infer<typeof eigenschutzTelemetryBatchSchema>;
