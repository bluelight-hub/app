/**
 * Command für den Sync-Konflikt-Folgecall vom Frontend (Story 3.9 AC4).
 *
 * **`entityType` Story-3.9-strikt:** Nur `'PSA_PROFIL_ZUWEISUNG'`. Story 3.10
 * + Phase-2-Gefährdungs-Konflikte erweitern auf den Domain-Event-Union-Typ
 * `'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM'`.
 *
 * **`localPayload` typisiert:** UI-Repräsentation des Verlierer-State
 * (Toggle-Set + Begründung + resolvedEinheitIds, siehe Frontend-Hook AC7).
 * Größen-Cap (4 KiB serialisiert) wird im Repository + Outbox-Serializer
 * verifiziert.
 */
export class ReportSyncConflictCommand {
  constructor(
    public readonly einsatzId: string,
    public readonly einheitId: string | null,
    public readonly entityType: 'PSA_PROFIL_ZUWEISUNG',
    public readonly entityId: string,
    public readonly fieldPath: string,
    public readonly localPayload: Record<string, unknown>,
    public readonly serverVersion: number,
    public readonly localExpectedVersion: number,
    public readonly callerUserId: string,
  ) {}
}

/**
 * Erfolgs-Payload des Handlers.
 *
 * `alreadyExisted === true` markiert einen Idempotenz-Treffer (Tab-Reload
 * oder Retry vom selben User auf dieselbe Verlierer-Row); der Caller darf
 * dann **kein** zusätzliches Event emittieren (siehe Handler).
 */
export interface ReportSyncConflictResult {
  syncConflictId: string;
  alreadyExisted: boolean;
}
