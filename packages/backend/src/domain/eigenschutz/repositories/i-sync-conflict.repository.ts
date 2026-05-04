import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { SyncConflictEntityType } from '@domain/eigenschutz/events/konflikt-erkannt.event';

/**
 * Domain-Port für die `sync_conflicts`-Persistenz (Story 3.9, FR50,
 * Architektur §B6).
 *
 * Story 3.9 nutzt ausschließlich `recordOrFindExisting` (Idempotenz-Pfad).
 * Die List-/Resolve-Operationen sind Story-3.10-Scope und werden in dieser
 * Story NICHT implementiert.
 */
export interface RecordSyncConflictInput {
  einsatzId: string;
  einheitId: string | null;
  entityType: SyncConflictEntityType;
  entityId: string;
  fieldPath: string;
  localPayload: Record<string, unknown>;
  serverVersion: number;
  localExpectedVersion: number;
  reportedByUserId: string;
}

export interface RecordSyncConflictResult {
  id: string;
  alreadyExisted: boolean;
}

export interface ISyncConflictRepository {
  /**
   * Idempotenter Insert: Sucht eine bestehende offene Konflikt-Row für
   * `(einsatzId, entityId, localExpectedVersion, reportedByUserId)` mit
   * `resolvedAt IS NULL`. Falls vorhanden → liefert die existierende Row
   * (kein neuer INSERT, kein neues Event-Emit aus Sicht des Aufrufers).
   * Sonst → INSERT der neuen Row.
   *
   * **Idempotenz-Schlüssel-Begründung:**
   * `(einsatzId, entityId, localExpectedVersion, reportedByUserId)` ist der
   * minimale natürliche Schlüssel: derselbe User, der zweimal denselben
   * Verlierer-Toggle (gleiche `expectedVersion`) auf dieselbe Row meldet,
   * meldet logisch denselben Konflikt. Die `serverVersion` und der
   * `localPayload` können sich beim Retry minimal unterscheiden (Server-
   * State ist inzwischen weiter gewandert) — die Idempotenz nutzt die
   * STABILE Verlierer-Identität, nicht den Server-Snapshot.
   *
   * **Größen-Cap:** `JSON.stringify(localPayload).length > 4096` →
   * `Result.fail('ValidationFailed:LocalPayloadTooLarge')` ohne DB-Roundtrip
   * (Defense-in-Depth zum Cap im Outbox-Serializer).
   *
   * **Ergebnis-Vertrag:**
   * - `Result.ok({ id, alreadyExisted: false })` → frischer Insert; Caller
   *   appended Outbox-Event in derselben Transaktion.
   * - `Result.ok({ id, alreadyExisted: true })` → Duplicate; Caller darf
   *   das Event NICHT erneut appenden, sonst Banner-Spam.
   * - `Result.fail('InfrastructureError:SyncConflictRepository:<message>')`
   *   bei DB-Fehler.
   * - `Result.fail('ValidationFailed:LocalPayloadTooLarge')` bei Cap-Verletzung.
   */
  recordOrFindExisting(input: RecordSyncConflictInput, tx?: TransactionContext): Promise<Result<RecordSyncConflictResult>>;
}
