import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { PsaProfil } from '@/generated/prisma/enums';
import type { PsaProfilZuweisung } from '../aggregates/psa-profil-zuweisung.aggregate';

/**
 * Read-Model-Repräsentation einer aktiven (oder historischen) PSA-Profil-
 * Zuweisung für GET-Responses (Story 3.1 AC9 — Frontend-Pre-Fill).
 *
 * Read-Model ≠ Aggregate (Lesson L5 aus Story 2.4): das Read-Model ist eine
 * Infrastructure-Type-Repräsentation, KEIN rehydriertes Aggregate. Die
 * Listen-Query muss nicht durch die Aggregate-Validierung — die Daten kommen
 * direkt aus der DB.
 */
export interface PsaProfilZuweisungReadRow {
  id: string;
  einsatzId: string;
  einheitId: string;
  profil: PsaProfil;
  gueltigVon: Date;
  gueltigBis: Date | null;
  aktiviertVonUserId: string;
  begruendung: string;
  propagationGroupId: string;
  version: number;
}

/**
 * Port für die Persistierung von `PsaProfilZuweisung`-Aggregaten (Story 3.1).
 *
 * Implementierungen leben im Infrastructure-Layer
 * (`infrastructure/eigenschutz/repositories/`).
 *
 * **Schließ-/Aktivierungs-Trennung:**
 * - `saveActivation()` legt eine neue aktive Row an (`gueltigBis = NULL`).
 *   Wird beim reinen Aktivieren ohne Vor-Profil verwendet.
 * - `closeActiveZuweisung()` schließt eine bestehende aktive Row
 *   (`gueltigBis = now()`, `version + 1`) per `updateMany WHERE id = ? AND
 *   version = expectedVersion` (Lost-Update-Sentinel via `count === 0`).
 * - `closeAndCreateNext()` ist die atomare Kombination beider — wird beim
 *   Profil-Wechsel A → B mit identischer `propagationGroupId` aufgerufen.
 *
 * **Application-Guard (AC8):** `saveActivation` und `closeAndCreateNext`
 * MÜSSEN innerhalb der TX prüfen, dass kein zweiter aktiver Eintrag für
 * `(einsatzId, einheitId, profil)` existiert — Sentinel
 * `ConflictDetected:DuplicateActivePsaProfilZuweisung`. Defense-in-Depth
 * neben dem optionalen Postgres-Partial-Unique-Index.
 */
export interface IPsaProfilZuweisungRepository {
  /**
   * Lädt die aktuell aktive (`gueltigBis IS NULL`) Zuweisung einer Einheit
   * für ein bestimmtes Profil. Liefert `null`, wenn keine aktive Row
   * existiert.
   *
   * Einsatz-Scoping ist Pflicht — Cross-Einsatz-Treffer werden auf
   * Repository-Ebene weggefiltert (Defense-in-Depth zur Guard-Kette).
   */
  findActiveByEinheit(einsatzId: string, einheitId: string, profil: PsaProfil, tx?: TransactionContext): Promise<Result<PsaProfilZuweisung | null>>;

  /**
   * Lädt eine Zuweisung per ID innerhalb eines Einsatzes. `null` wenn nicht
   * vorhanden oder Cross-Einsatz.
   */
  findByZuweisungId(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<PsaProfilZuweisung | null>>;

  /**
   * Persistiert eine **neue** aktive Zuweisung (Pfad „Aktivieren ohne
   * Vor-Profil"). Sentinel `ConflictDetected:DuplicateActivePsaProfilZuweisung`
   * bei AC8-Verletzung; sonst `Result.ok()`.
   */
  saveActivation(aggregate: PsaProfilZuweisung, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Schließt eine bestehende aktive Zuweisung (Pfad „Deaktivieren").
   * Erwartet, dass das Aggregate bereits via `deactivate(...)` mutiert
   * wurde (gueltigBis gesetzt, version inkrementiert) — das Repository
   * persistiert die Mutation atomar via DB-Lost-Update-Check.
   *
   * Sentinels:
   * - `ConflictDetected:PsaProfilZuweisung[:current=<n>]` bei Versions-Mismatch
   * - `NotFound:PsaProfilZuweisung` wenn die Row im Zwischenraum gelöscht wurde
   */
  closeActiveZuweisung(aggregate: PsaProfilZuweisung, expectedVersion: number, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Atomare Kombination: bestehende aktive Zuweisung schließen UND neue
   * aktive Zuweisung anlegen — beide mit identischer `propagationGroupId`
   * (Pfad „Wechsel A → B" innerhalb desselben Profils).
   *
   * Diese Methode ist im Single-Select-Story-Scope wenig relevant (echte
   * Wechsel innerhalb desselben Profils sind selten), aber der Port hält
   * den Pfad bereit, damit Story 3.2 (Bulk) ihn nutzen kann.
   */
  closeAndCreateNext(closing: PsaProfilZuweisung, expectedVersion: number, next: PsaProfilZuweisung, tx: TransactionContext): Promise<Result<void>>;
}

/**
 * Read-Repository-Port für GET-Responses und UI-Pre-Fill (Story 3.1 AC9).
 *
 * Trennt die Read-Pfade vom Mutating-Repository (Lesson L5 aus Story 2.4 —
 * `GefaehrdungsbeurteilungVersion`-Pattern: Read-Model ist Infrastructure-
 * Type, NICHT rehydriertes Aggregate).
 */
export interface IPsaProfilZuweisungReadRepository {
  /**
   * Liefert alle aktuell aktiven (`gueltigBis IS NULL`) Profile einer
   * konkreten Einheit, sortiert nach `profil`-Enum-Reihenfolge (BASIS,
   * INFEKTION, VU, CBRN_PATIENT, VOLLSCHUTZ).
   *
   * `Result.ok([])` wenn die Einheit kein aktives Profil hat oder die
   * Einheit nicht (mehr) zum Einsatz gehört.
   */
  findActiveProfileByEinheit(einsatzId: string, einheitId: string, tx?: TransactionContext): Promise<Result<PsaProfilZuweisungReadRow[]>>;
}
