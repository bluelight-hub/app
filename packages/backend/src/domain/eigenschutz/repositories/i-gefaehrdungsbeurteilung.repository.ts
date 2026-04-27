import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { Gefaehrdungsbeurteilung } from '../aggregates/gefaehrdungsbeurteilung.aggregate';

/**
 * Read-Model für GET-Responses. Enthält zusätzlich zu den Aggregate-Feldern
 * die Persistenz-Metadaten (`erstelltAm`, `aktualisiertAm`,
 * `aktualisiertVonUserId`), die das Aggregate selbst bewusst nicht trägt.
 *
 * Das Aggregate selbst bleibt schlank und Framework-agnostisch; das Read-Model
 * ist die Antwort des Repositories auf die Factory-Forderung
 * (`toGefaehrdungsbeurteilungDto`), die genau diese Metadaten braucht.
 */
export interface GefaehrdungsbeurteilungReadModel {
  aggregate: Gefaehrdungsbeurteilung;
  erstelltAm: Date;
  aktualisiertAm: Date;
  aktualisiertVonUserId: string;
}

/**
 * Port (Hexagonal-Architektur) für die Persistierung der
 * `Gefaehrdungsbeurteilung`-Aggregate.
 *
 * Implementierungen liegen im Infrastructure-Layer
 * (`infrastructure/eigenschutz/repositories/`).
 *
 * Story 2.1 benötigt nur Create- und Lookup-Operationen; weitere Methoden
 * (`findByEinsatz`, `saveNewVersion`, …) kommen in Epic 2.2–2.5 dazu.
 */
export interface IGefaehrdungsbeurteilungRepository {
  /**
   * Speichert das Aggregate innerhalb der übergebenen Transaktion. Der
   * Aufrufer (TransactionalCommandHandler) garantiert, dass Outbox-Events
   * atomar in derselben Transaktion committed werden.
   */
  save(aggregate: Gefaehrdungsbeurteilung, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Lädt eine Beurteilung per ID. Liefert `Result.ok(null)`, wenn keine Zeile
   * existiert — Not-Found ist ein erwartetes Ergebnis, kein Exception-Fall.
   */
  findById(id: string, tx?: TransactionContext): Promise<Result<Gefaehrdungsbeurteilung | null>>;

  /**
   * Lädt eine Beurteilung als Read-Model (inkl. Timestamps +
   * `aktualisiertVonUserId`). Wird vom GET-Controller für das Response-DTO
   * genutzt, weil das Aggregate die Persistenz-Metadaten bewusst nicht kennt.
   * Liefert `Result.ok(null)`, wenn keine Zeile existiert.
   */
  findReadModelById(id: string, tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungReadModel | null>>;

  /**
   * Lädt alle Beurteilungen eines Einsatzes als Read-Model-Liste.
   *
   * Sortierung ist Teil des Repository-Kontrakts: zuletzt aktualisierte
   * Beurteilungen zuerst, stabilisiert über `erstelltAm` und `id`.
   */
  findReadModelsByEinsatz(einsatzId: string, tx?: TransactionContext): Promise<Result<GefaehrdungsbeurteilungReadModel[]>>;

  /**
   * Prüft, ob bereits eine Beurteilung für `(einsatzId, einheitId)` existiert.
   * Wird im Handler für den Business-Check genutzt, bevor das Aggregate
   * erstellt wird (Ziel: strukturierter 422-Fehler statt roher Prisma-P2002).
   */
  existsForEinheit(einsatzId: string, einheitId: string, tx: TransactionContext): Promise<Result<boolean>>;

  /**
   * Schreibt das bestehende Aggregate zurück (Items + Version). Der Aufrufer
   * (Handler) garantiert, dass die Aggregate-Version bereits inkrementiert
   * wurde und der Conflict-Check auf Aggregate-Ebene erfolgt ist. Das Repo
   * aktualisiert `items`, `version`, `aktualisiertAm` (Prisma `@updatedAt`)
   * und `aktualisiertVonUserId` — letzterer MUSS explizit gesetzt werden.
   */
  updateItems(aggregate: Gefaehrdungsbeurteilung, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>>;
}
