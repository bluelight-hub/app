import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { Sicherungsposten } from '../aggregates/sicherungsposten.aggregate';

/**
 * Read-Model-Shape für Listen-Endpunkte. Enthält alle Aggregate-Felder plus
 * Persistenz-Metadaten (`erstelltAm`, `aktualisiertAm`, `aktualisiertVonUserId`).
 *
 * Die Methode `findById` liefert das volle Aggregate (für den Update-Pfad,
 * der das Aggregate mutieren muss). Die Listen-Methoden liefern dieses Read-
 * Model — für die DTO-Factory reichen die JSONB-Snapshots, ein Aggregate-
 * Rehydrate ist auf dem Read-Pfad nicht nötig.
 */
export interface SicherungspostenReadModel {
  aggregate: Sicherungsposten;
  erstelltAm: Date;
  aktualisiertAm: Date;
  aktualisiertVonUserId: string;
}

/**
 * Port (Hexagonal-Architektur) für die Persistierung der `Sicherungsposten`-
 * Aggregate. Implementierungen liegen in
 * `infrastructure/eigenschutz/repositories/`.
 */
export interface ISicherungspostenRepository {
  /**
   * Speichert das Aggregate (Insert oder Update) innerhalb der übergebenen
   * Transaktion. Schreibt zusätzlich einen Versions-Snapshot in
   * `SicherungspostenVersion` mit `payload` = Top-Level-Felder + `eventId` aus
   * dem ersten Aggregate-Event.
   */
  save(aggregate: Sicherungsposten, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Lädt einen Sicherungsposten als volles Aggregate per ID.
   * `Result.ok(null)` = Not-Found (erwartetes Ergebnis, kein Exception-Fall).
   */
  findById(id: string, tx?: TransactionContext): Promise<Result<Sicherungsposten | null>>;

  /**
   * Lädt einen Sicherungsposten als Read-Model (inkl. Timestamps) per ID.
   * `Result.ok(null)` = Not-Found.
   */
  findReadModelById(id: string, tx?: TransactionContext): Promise<Result<SicherungspostenReadModel | null>>;

  /**
   * Listet alle aktiven (nicht-aufgelösten) Sicherungsposten eines Einsatzes
   * als Read-Model-Liste, sortiert nach `aktualisiertAm DESC, id ASC`.
   */
  findActiveByEinsatzId(einsatzId: string): Promise<Result<SicherungspostenReadModel[]>>;

  /**
   * Listet alle aufgelösten Sicherungsposten eines Einsatzes, sortiert nach
   * `aufgeloestAm DESC, id ASC`.
   */
  findResolvedByEinsatzId(einsatzId: string): Promise<Result<SicherungspostenReadModel[]>>;

  /**
   * Prüft, ob ein Sicherungsposten mit der gegebenen ID im Einsatz existiert.
   * Wird vor Update/Aufloesen zur Authorization genutzt.
   */
  existsInEinsatz(einsatzId: string, postenId: string, tx?: TransactionContext): Promise<Result<boolean>>;
}
