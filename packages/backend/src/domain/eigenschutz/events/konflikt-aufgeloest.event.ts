import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';
import type { SyncConflictEntityType } from './konflikt-erkannt.event';

/**
 * Resolutions-Modi für `SyncConflict.resolution` (Architektur §B6, Z. 1377–1385).
 *
 * - `SERVER_WINS`: Server-State bleibt wie er ist. Keine Aggregat-Mutation.
 * - `LOCAL_WINS`: Verlierer-State wird angewendet — Story 3.10 macht das via
 *   bestehendes Aggregat (`PsaProfilZuweisung`), kein Sub-Command-Dispatch.
 * - `MERGED`: Phase-1 (PSA-Profil-Row) ≡ `SERVER_WINS` + Audit-Marker.
 *   Phase-2 (Gefährdungs-Items) implementiert echten Field-Merge.
 */
export type SyncConflictResolution = 'SERVER_WINS' | 'LOCAL_WINS' | 'MERGED';

/**
 * Domain-Event — „Sync-Konflikt manuell aufgelöst" (Story 3.10, FR50,
 * Architektur §B6 + §G1).
 *
 * Wird vom `ResolveKonfliktHandler` atomar mit `markResolved` und ggf. einer
 * Aggregat-Mutation (LOCAL_WINS-Reapply) in derselben Outbox-Transaktion
 * publiziert. Adapter
 * (`infrastructure/eigenschutz/event-adapters/konflikt-aufgeloest.adapter.ts`)
 * broadcastet anschließend an Room `einsatz:{einsatzId}` über den Channel
 * `eigenschutz:konflikt-aufgeloest`. Frontend nutzt den Frame zur
 * Liste-Invalidation und zum Auto-Dismiss des Story-3.9-Mikro-Banners.
 *
 * **Aggregate-Identity:** `aggregateId = syncConflictId`. Im Gegensatz zu
 * `KonfliktErkanntEvent` (`aggregateId = entityId`) ist hier der Konflikt-
 * Datensatz selbst die Aggregat-Wurzel — Resolve ist die finale Mutation am
 * `SyncConflict`-Audit-Aggregat. Replay-Drill-Down „alle Resolves für diesen
 * Konflikt" wird damit trivial.
 *
 * **`resolvedAt` als eigenes Feld neben `occurredOn`:** Architektur §B6
 * verlangt `sync_conflict.resolvedAt` als persistierbares Feld. Mapping
 * `occurredOn = resolvedAt`, aber zusätzlich explizit auf der Event-Klasse —
 * der WS-Frame trägt den Zeitstempel deterministisch encoded (Konsistenz mit
 * Story-3.4 `QuittungAbgegebenEvent.quittiertAm`).
 *
 * **`einheitId`-Optionalität:** Phase-2 (`GEFAEHRDUNGSBEURTEILUNG_ITEM`)
 * kann einheit-übergreifend sein → `einheitId` ist optional, mappt
 * `null → undefined` an die Basisklasse.
 */
export class KonfliktAufgeloestEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    resolvedByUserId: string,
    einheitId: string | null,
    public readonly syncConflictId: string,
    public readonly entityType: SyncConflictEntityType,
    public readonly entityId: string,
    public readonly fieldPath: string,
    public readonly resolution: SyncConflictResolution,
    public readonly resolvedAt: Date,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, resolvedByUserId, einheitId ?? undefined, aggregateId ?? syncConflictId, occurredOn ?? resolvedAt);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.KONFLIKT_AUFGELOEST;
  }
}
