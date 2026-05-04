import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { SyncConflictEntityType } from '@domain/eigenschutz/events/konflikt-erkannt.event';
import type { SyncConflictResolution } from '@domain/eigenschutz/events/konflikt-aufgeloest.event';

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

/**
 * Optionale Filter für die List-Query (Story 3.10 AC2 + UI-Filter-Bar AC8).
 */
export interface SyncConflictListFilter {
  /** Optional: nur Konflikte eines bestimmten EntityType. */
  readonly entityType?: SyncConflictEntityType;
  /** Optional: nur Konflikte einer bestimmten Einheit (Mikro-Banner-Deeplink). */
  readonly einheitId?: string;
}

/**
 * Read-Model für die List-Anzeige (Story 3.10 AC2).
 *
 * Bewusst kein Domain-Aggregat — `SyncConflict` ist eine reine Audit-/State-
 * Tabelle ohne Aggregate-Invarianten.
 */
export interface SyncConflictReadModel {
  readonly id: string;
  readonly einsatzId: string;
  readonly einheitId: string | null;
  readonly entityType: SyncConflictEntityType;
  readonly entityId: string;
  readonly fieldPath: string;
  readonly localPayload: Record<string, unknown>;
  readonly serverVersion: number;
  readonly localExpectedVersion: number;
  readonly reportedAt: Date;
  readonly reportedByUserId: string;
  readonly resolvedAt: Date | null;
  readonly resolvedByUserId: string | null;
  readonly resolution: SyncConflictResolution | null;
}

export interface MarkResolvedResult {
  /** `true` wenn der zweite parallele Resolve-Aufruf das Race verloren hat. */
  alreadyResolved: boolean;
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

  /**
   * Liste offener Konflikte (Story 3.10 AC2). Sortiert nach `reportedAt DESC`,
   * gecapped auf 200 Rows (Skalierungs-Reserve über NFR-C3 ≥ 20).
   *
   * Nutzt den Index `@@index([einsatzId, resolvedAt])` aus dem Prisma-Schema.
   */
  findOpenByEinsatzId(einsatzId: string, filter?: SyncConflictListFilter): Promise<Result<readonly SyncConflictReadModel[]>>;

  /**
   * Single-Row-Lookup (Story 3.10 AC2). `null` bei Not-Found (kein Fehler).
   */
  findById(syncConflictId: string): Promise<Result<SyncConflictReadModel | null>>;

  /**
   * Markiert einen Konflikt als aufgelöst (Story 3.10 AC2). Idempotent via
   * `updateMany WHERE id=? AND resolvedAt IS NULL` — zwei parallele Resolve-
   * Aufrufe ergeben genau einen Winner; der zweite erhält `alreadyResolved=true`.
   *
   * **Hinweis:** Kein OCC-Versions-Check, da `SyncConflict` kein `version`-Feld
   * hat (Architektur §B6). Idempotenz läuft ausschließlich über `resolvedAt IS NULL`.
   */
  markResolved(syncConflictId: string, resolution: SyncConflictResolution, resolvedByUserId: string, resolvedAt: Date, tx?: TransactionContext): Promise<Result<MarkResolvedResult>>;
}
