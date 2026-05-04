import type { SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';

/**
 * Command für das manuelle Auflösen eines Sync-Konflikts durch einen
 * Sicherheitsbeauftragten (Story 3.10 AC4, FR50).
 *
 * **`resolution`-Semantik (Pivot-Anker):**
 * - `SERVER_WINS` — Server-State bleibt; nur `markResolved` + Event.
 *   Entity-agnostisch zulässig.
 * - `LOCAL_WINS` — Verlierer-State wird via `PsaProfilZuweisung`-Aggregat
 *   reapplied. Nur für `entityType === 'PSA_PROFIL_ZUWEISUNG'` zulässig.
 * - `MERGED` — Phase-1-MVP für PSA-Konflikte: funktional identisch zu
 *   `SERVER_WINS` plus Audit-Marker (`resolution = 'MERGED'`). Nur für
 *   `'PSA_PROFIL_ZUWEISUNG'` zulässig; Phase 2 implementiert echten
 *   Field-Merge für `'GEFAEHRDUNGSBEURTEILUNG_ITEM'`.
 */
export class ResolveKonfliktCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly syncConflictId: string,
    public readonly resolution: SyncConflictResolution,
    public readonly callerUserId: string,
  ) {}
}

/**
 * Erfolgs-Payload des Handlers.
 *
 * `alreadyResolved === true` markiert einen Idempotenz-Treffer (Tab-Reload
 * oder paralleler zweiter Resolve-Call); der Caller erhält den Body trotzdem
 * (HTTP 200), aber der Handler hat **kein** Event emittiert.
 */
export interface ResolveKonfliktResult {
  readonly syncConflictId: string;
  readonly alreadyResolved: boolean;
  readonly resolvedAt: Date;
}
