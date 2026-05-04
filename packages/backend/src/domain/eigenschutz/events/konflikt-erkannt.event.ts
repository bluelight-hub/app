import { EVENT_NAMES } from '@domain/events/event-names';
import { EigenschutzDomainEvent } from './eigenschutz-domain-event';

/**
 * Domain-Event — „Sync-Konflikt auf kritischem Eigenschutz-Feld erkannt"
 * (Story 3.9, FR50, Architektur §B6 + §E).
 *
 * Wird vom `ReportSyncConflictHandler` atomar mit dem `INSERT` in
 * `sync_conflicts` (Repository-Idempotenz, AC3) in derselben
 * Outbox-Transaktion publiziert. Adapter
 * (`infrastructure/eigenschutz/event-adapters/konflikt-erkannt.adapter.ts`)
 * broadcastet anschließend an Room `einsatz:{einsatzId}` über den Channel
 * `eigenschutz:konflikt-erkannt`, damit der Sicherheitsbeauftragte den
 * `warning`-Mikro-Banner „Sync-Konflikt auf Abschnitt X – jetzt auflösen"
 * (Epic-AC) live sieht (Pattern Story 3.6 LueckeGemeldet).
 *
 * **`entityType` Pflicht:** Story 3.9 emittiert ausschließlich
 * `'PSA_PROFIL_ZUWEISUNG'` (PSA-Profil-OCC ist der einzige Konflikt-Pfad
 * in dieser Story). Für Story 3.10 / Phase 2 ist `entityType` jedoch
 * bewusst entity-agnostisch typisiert (`SyncConflictEntityType`-Enum
 * `'GEFAEHRDUNGSBEURTEILUNG_ITEM' | 'PSA_PROFIL_ZUWEISUNG'`,
 * Architektur Z. 1376–1379) — Schema bleibt forward-kompatibel.
 *
 * **`fieldPath` für PSA-Profil-Zuweisung konstant `'profil'`:** Die
 * Konflikt-Granularität ist row-level, nicht field-level — der Konflikt
 * ist immer „diese ganze Profil-Aktivierung wurde überschrieben". Das
 * Feld bleibt für Story 3.10 (`ConflictResolutionList` Spaltentitel) und
 * Phase 2 (Gefährdungsitems-field-level) konsistent typisiert
 * (`@db.VarChar(200)`-Constraint).
 *
 * **`localPayload` JSONB:** vom Client gelieferte UI-Repräsentation des
 * Verlierer-State (Toggle-Set + begruendung + expectedVersion). Schema-
 * agnostisch im Domain-Event — der Adapter / das Repository validieren
 * Größen-Cap (≤ 4 KiB serialisiert, AC3). Persistiert wird, was Client
 * sendet — Story 3.10 zeigt es in der Liste an.
 *
 * **`reportedByUserId` Pflicht (= `userId` der Basisklasse):** Der
 * meldende User ist immer der Verlierer der Race — sein JWT-Subject im
 * Folgecall. Für Audit-Filter via Basisklasse erreichbar.
 *
 * **Aggregate-Identity:** `aggregateId = entityId` (CUID der
 * konfliktierenden `PsaProfilZuweisung`-Row). Damit ist eine künftige
 * Replay-Drill-Down-Query nach Aggregate (alle Konflikte einer
 * Zuweisung) trivial.
 *
 * **`einheitId`-Optionalität:** `EigenschutzDomainEvent`-Basisklasse hat
 * `einheitId?: string`. `SyncConflict.einheitId` im Schema ist `String?`.
 * Für PSA-Profil-Konflikte in Story 3.9 ist `einheitId` immer gesetzt
 * (Zuweisung ist einheit-scoped); der Constructor akzeptiert `string |
 * null` und mappt `null → undefined` an die Basisklasse, damit Phase 2
 * (Gefährdungs-Konflikt einheit-übergreifend) forward-kompatibel bleibt.
 */
export type SyncConflictEntityType = 'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM';

export class KonfliktErkanntEvent extends EigenschutzDomainEvent {
  constructor(
    einsatzId: string,
    reportedByUserId: string,
    einheitId: string | null,
    public readonly entityType: SyncConflictEntityType,
    public readonly entityId: string,
    public readonly fieldPath: string,
    public readonly localPayload: Record<string, unknown>,
    public readonly serverVersion: number,
    public readonly localExpectedVersion: number,
    aggregateId?: string,
    occurredOn?: Date,
  ) {
    super(einsatzId, reportedByUserId, einheitId ?? undefined, aggregateId ?? entityId, occurredOn);
  }

  static eventName(): string {
    return EVENT_NAMES.EIGENSCHUTZ.KONFLIKT_ERKANNT;
  }
}
