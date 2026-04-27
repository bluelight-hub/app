import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';

/**
 * Read-Model für eine `SicherheitsregelQuittung` (Story 2.7).
 *
 * Wird von Repository-Reads zurückgeliefert; das Application-Layer (Query-
 * Handler / Factory) reichert um optionale User-Namen an, bevor die DTO-
 * Antwort an den Controller geht.
 */
export interface SicherheitsregelQuittungReadModel {
  id: string;
  regelId: string;
  einheitId: string;
  einheitName: string;
  quittiertAm: Date;
  quittiertVonUserId: string;
}

/**
 * Parameter für `upsert(...)` — der Handler übergibt nur die Pflicht-Felder
 * (`regelId`, `einheitId`, `quittiertVonUserId`). Der Persistenz-Adapter
 * generiert die Row-ID (cuid2) und den `quittiertAm`-Timestamp selbst, damit
 * das Aggregate-Layer keine Wallclock-Logik braucht.
 */
export interface UpsertSicherheitsregelQuittungParams {
  regelId: string;
  einheitId: string;
  quittiertVonUserId: string;
}

/**
 * Ergebnis des Upsert-Pfads. `created === true` markiert, dass eine neue
 * Quittung-Row angelegt wurde — der Handler emittiert in diesem Fall ein
 * `SicherheitsregelQuittiertEvent`. `created === false` ist der idempotente
 * Re-Ack (P2002-Constraint-Violation) — kein Event, gleicher HTTP-204.
 */
export interface UpsertSicherheitsregelQuittungResult {
  created: boolean;
  quittung: SicherheitsregelQuittungReadModel;
}

/**
 * Port (Hexagonal-Architektur) für die Persistierung der Quittungen einer
 * Sicherheitsregel (Story 2.7). Implementierung im Infrastructure-Layer
 * (`infrastructure/eigenschutz/repositories/prisma-sicherheitsregel-quittung.repository.ts`).
 *
 * **Idempotenz:** Der Adapter implementiert den Upsert über
 * `try { create } catch (P2002) { … return { created: false, … } }`. Der DB-
 * seitige Unique-Constraint `@@unique([regelId, einheitId])` (Schema seit
 * Story 1.4, Prisma) ist die Wahrheit — Application-Layer-Locking ist nicht
 * nötig.
 */
export interface ISicherheitsregelQuittungRepository {
  /**
   * Legt eine neue Quittung an oder liefert die bestehende zurück.
   *
   * **Sentinel-Verträge:**
   * - Erfolgs-Insert → `Result.ok({ created: true, quittung })`
   * - Idempotenter Re-Ack (P2002) → `Result.ok({ created: false, quittung })`
   *   (die bestehende Row wird per `findFirst({ regelId, einheitId })` nachgeladen)
   * - Unerwarteter DB-Fehler → `Result.fail<UpsertSicherheitsregelQuittungResult>('InfrastructureError:SicherheitsregelQuittung:…')`
   */
  upsert(tx: TransactionContext, params: UpsertSicherheitsregelQuittungParams): Promise<Result<UpsertSicherheitsregelQuittungResult>>;

  /**
   * Listet alle Quittungen einer Regel — sortiert nach `quittiertAm DESC`,
   * stabilisiert über `id ASC`. Wird vom Sender-View
   * (`GET /sicherheitsregeln/:id/quittungen`) konsumiert.
   *
   * `einsatzId` ist Defense-in-Depth: das Repository prüft, dass die Regel
   * im richtigen Einsatz hängt — Cross-Einsatz-Lookups sind ausgeschlossen
   * (Memory-Note „Einsatz-Routen-Nesting").
   */
  findByRegel(einsatzId: string, regelId: string, tx?: TransactionContext): Promise<Result<SicherheitsregelQuittungReadModel[]>>;

  /**
   * Prüft, ob eine konkrete Einheit die Regel bereits quittiert hat.
   * Wird vom Frontend-Empfangs-View für die Per-Zeile-Anzeige genutzt
   * (Story 2.7 AC13). Liefert `null`, wenn keine Quittung existiert.
   */
  findByRegelAndEinheit(einsatzId: string, regelId: string, einheitId: string, tx?: TransactionContext): Promise<Result<SicherheitsregelQuittungReadModel | null>>;
}
