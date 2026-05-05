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
 *
 * **Strict-Mode + `.min(1)`:** Identifier-Felder dürfen nicht leer sein
 * (Drift-Defense: ein leeres `eventId` würde den LRU-Dedup-Cache vergiften,
 * ein leeres `einsatzId` die Cross-Einsatz-Isolation aushebeln). Pattern
 * gespiegelt aus dem ursprünglichen Frontend-Hook-Inline-Schema, das via
 * F11 auf dieses Shared-Schema migriert wurde.
 *
 * **`{ offset: true }` auf `resolvedAt`:** Backend serialisiert ISO-8601
 * mit Timezone-Offset (z. B. `+02:00`); ohne `offset: true` würde Zod
 * jeden Frame mit Offset-Suffix verwerfen.
 */
export const KonfliktAufgeloestWsPayloadSchema = z
  .object({
    eventId: z.string().min(1),
    einsatzId: z.string().min(1),
    einheitId: z.string().nullable(),
    syncConflictId: z.string().min(1),
    entityType: z.enum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM']),
    entityId: z.string().min(1),
    fieldPath: z.string().max(200),
    resolution: z.enum(['SERVER_WINS', 'LOCAL_WINS', 'MERGED']),
    resolvedAt: z.string().datetime({ offset: true }),
    resolvedByUserId: z.string().min(1),
  })
  .strict();

export type KonfliktAufgeloestWsPayload = z.infer<typeof KonfliktAufgeloestWsPayloadSchema>;
