import { z } from 'zod';

/**
 * Zod-Schema für die `localPayload`-Form, die der `ResolveKonfliktHandler`
 * im `LOCAL_WINS`-Pfad für `entityType === 'PSA_PROFIL_ZUWEISUNG'` erwartet
 * (Story 3.10 AC4 + Dev-Notes „Reapply-Strategie").
 *
 * Der Verlierer-Client hat genau dieses Objekt im Story-3.9-Folgecall
 * `POST /sync-conflicts` mitgesendet (`useChangePsaProfil`-Folgecall).
 * Wir validieren defensiv vor dem Reapply, weil die Persistenz-Spalte
 * `local_payload` ein freies JSONB ist und gegen Schema-Drift nur
 * Größen-Cap (4 KiB) durchsetzt, kein Struktur-Schema. Eine spätere
 * Server-Version (Phase 2) könnte das Schema strikter machen — der
 * Reapply-Pfad muss heute robust gegen veraltete Drift-Payloads bleiben.
 *
 * **Strikt-Modus (`.strict()`):** Unbekannte Top-Level-Keys werden
 * abgelehnt. Vermeidet Silent-Drift, in dem ein Frontend-Bug ein zusätzliches
 * Feld einschmuggelt, das hier dann ignoriert würde.
 *
 * **`begruendung.min(1)`:** Das `PsaProfilZuweisung`-Aggregat (Story 3.1)
 * lehnt leere Begründungen ab; das Schema spiegelt die Aggregate-Invariante,
 * damit ein Drift-Payload früh in der `LocalWinsPayloadInvalid`-Schiene
 * landet statt mitten im Reapply zu scheitern.
 */
export const LocalWinsPsaProfilPayloadSchema = z
  .object({
    toggles: z
      .array(
        z.object({
          profil: z.enum(['BASIS', 'INFEKTION', 'VU', 'CBRN_PATIENT', 'VOLLSCHUTZ']),
          aktiv: z.boolean(),
        }),
      )
      .min(1),
    begruendung: z.string().min(1).max(500),
    resolvedEinheitIds: z.array(z.string()).min(1),
  })
  .strict();

export type LocalWinsPsaProfilPayload = z.infer<typeof LocalWinsPsaProfilPayloadSchema>;
