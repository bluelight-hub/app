import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';

/**
 * Read-Model für eine `PsaProfilQuittung` (Story 3.4).
 *
 * Wird vom Repository-Read zurückgeliefert; das Application-Layer reichert
 * `einheitName` / `quittiertVonUserName` separat an, bevor die DTO-Antwort
 * an den Controller geht (Architektur §B5: Klartext nur via REST-Refetch).
 *
 * **Lücke-Felder reserviert für Story 3.6:** `lueckeGemeldet` / `lueckeNotiz`
 * sind im Schema seit Story 1.4 vorhanden, aber Story 3.4 schreibt sie nie —
 * eine Lücke-Meldung ist ein eigener Command (`ReportLueckeCommand`,
 * Story 3.6). Read-Pfade exponieren die Felder als optional.
 */
export interface PsaProfilQuittungReadModel {
  id: string;
  propagationGroupId: string;
  einsatzId: string;
  einheitId: string;
  quittiertAm: Date;
  quittiertVonUserId: string;
  lueckeGemeldet: boolean;
  lueckeNotiz: string | null;
}

/**
 * Parameter für `upsert(...)` — der Handler übergibt nur die Pflicht-Felder.
 * Der Persistenz-Adapter generiert die Row-ID (cuid2) und den
 * `quittiertAm`-Timestamp selbst.
 */
export interface UpsertPsaProfilQuittungParams {
  propagationGroupId: string;
  einheitId: string;
  einsatzId: string;
  quittiertVonUserId: string;
}

/**
 * Parameter für `upsertWithLuecke(...)` (Story 3.6 AC3).
 *
 * **Semantik:** Quittung+Lücke atomar (Q2-Default). Wenn keine Row existiert,
 * wird sie mit `lueckeGemeldet=true` + `lueckeNotiz` angelegt. Wenn eine
 * Row existiert (vorab quittiert oder vorherige Lücke-Meldung), wird sie
 * geupdated — `quittiertAm` bleibt erhalten (Audit-Pflicht).
 *
 * **`lueckeNotiz`:** Bereits getrimmt vom Caller (Handler trimmt vor
 * Aufruf), Domain-Validation Min/Max im DTO. Schema-Constraint:
 * `VARCHAR(1000)`.
 */
export interface UpsertWithLueckeParams {
  propagationGroupId: string;
  einheitId: string;
  einsatzId: string;
  quittiertVonUserId: string;
  lueckeNotiz: string;
}

/**
 * Ergebnis des Upsert-Pfads. `created === true` markiert, dass eine neue
 * Quittung-Row angelegt wurde — der Handler emittiert in diesem Fall ein
 * `QuittungAbgegebenEvent`. `created === false` ist der idempotente
 * Re-Ack (P2002) — kein Event, gleicher HTTP-204.
 */
export interface UpsertPsaProfilQuittungResult {
  created: boolean;
  row: PsaProfilQuittungReadModel;
}

/**
 * Port (Hexagonal-Architektur) für die Persistierung der PSA-Quittungen
 * (Story 3.4). Implementierung im Infrastructure-Layer
 * (`infrastructure/eigenschutz/repositories/prisma-psa-profil-quittung.repository.ts`).
 *
 * **Idempotenz:** Der Adapter implementiert den Upsert über
 * `try { create } catch (P2002) { … return { created: false, … } }`. Der
 * DB-Constraint `@@unique([propagationGroupId, einheitId])` (Schema seit
 * Story 1.4) ist die Wahrheit — Application-Layer-Locking ist nicht nötig.
 */
export interface IPsaProfilQuittungRepository {
  /**
   * Legt eine neue Quittung an oder liefert die bestehende zurück.
   *
   * **Sentinel-Verträge:**
   * - Erfolgs-Insert → `Result.ok({ created: true, row })`
   * - Idempotenter Re-Ack (P2002) → `Result.ok({ created: false, row })`
   * - Unerwarteter DB-Fehler → `Result.fail(...'InfrastructureError:PsaProfilQuittung:…')`
   */
  upsert(tx: TransactionContext, params: UpsertPsaProfilQuittungParams): Promise<Result<UpsertPsaProfilQuittungResult>>;

  /**
   * Upsert mit Lücke-Markern (Story 3.6 AC3, FR20).
   *
   * **Verhalten:**
   * - **Create-Pfad:** Keine Row existiert → Insert mit `lueckeGemeldet=true`
   *   + `lueckeNotiz` → `{ created: true, row }`.
   * - **Update-Pfad:** Row existiert (vorab quittiert oder doppelter Lücke-
   *   Send) → Update von `lueckeGemeldet/lueckeNotiz` → `{ created: false,
   *   row }`. **`quittiertAm` wird bewusst NICHT überschrieben** — die
   *   ursprüngliche Quittungs-Zeit bleibt für den Audit-Trail erhalten.
   *
   * **Idempotenz:** Im Gegensatz zu `upsert(...)` ist hier KEIN P2002-Catch
   * nötig — Prisma's natives Upsert-Pattern (`upsert({ where, create,
   * update })`) löst die Race-Condition direkt auf DB-Ebene. Eine doppelte
   * Lücke-Meldung mit anderer Notiz ist erlaubt (Notiz-Korrektur).
   *
   * **Sentinel-Verträge:**
   * - Erfolg → `Result.ok({ created, row })`
   * - DB-Fehler → `Result.fail('InfrastructureError:PsaProfilQuittung:Luecke:…')`
   */
  upsertWithLuecke(tx: TransactionContext, params: UpsertWithLueckeParams): Promise<Result<UpsertPsaProfilQuittungResult>>;

  /**
   * Listet alle Quittungen einer Bekanntgabe-Gruppe — sortiert nach
   * `quittiertAm DESC`, stabilisiert über `id ASC`. Wird vom Sender-View
   * (`GET /psa-profile/propagation-groups/:groupId/quittungen`) konsumiert.
   */
  findByGroup(propagationGroupId: string, tx?: TransactionContext): Promise<Result<PsaProfilQuittungReadModel[]>>;

  /**
   * Wie `findByGroup`, aber mit zusätzlichem Defense-in-Depth-Filter auf
   * `einsatzId`. Cross-Einsatz-Lookups sind ausgeschlossen
   * (Memory-Note „Einsatz-Routen-Nesting").
   */
  findByEinsatzAndGroup(einsatzId: string, propagationGroupId: string, tx?: TransactionContext): Promise<Result<PsaProfilQuittungReadModel[]>>;
}
