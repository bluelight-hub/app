import { z } from 'zod';

/**
 * WS-Payload-Schema für `eigenschutz:konflikt-aufgeloest` (Story 3.10 AC6).
 *
 * Wird sowohl Backend-side (Adapter-Spec verifiziert dass Broadcast diesem
 * Schema folgt) als auch Frontend-side (`useEigenschutzKonfliktAufgeloestLive`
 * Drift-Defense) konsumiert.
 *
 * **PII-Vertrag:** kein `localPayload` — der Resolve-Frame ist primär
 * Audit/Cache-Invalidations-Signal, die volle Konflikt-Datenladung läuft
 * via `GET /sync-conflicts`. Pattern identisch zu Story 3.9
 * `KonfliktErkanntWsPayloadSchema`.
 */
export const KonfliktAufgeloestWsPayloadSchema = z
  .object({
    eventId: z.string(),
    einsatzId: z.string(),
    einheitId: z.string().nullable(),
    syncConflictId: z.string(),
    entityType: z.enum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM']),
    entityId: z.string(),
    fieldPath: z.string().max(200),
    resolution: z.enum(['SERVER_WINS', 'LOCAL_WINS', 'MERGED']),
    resolvedAt: z.string().datetime(),
    resolvedByUserId: z.string(),
  })
  .strict();

export type KonfliktAufgeloestWsPayload = z.infer<typeof KonfliktAufgeloestWsPayloadSchema>;
