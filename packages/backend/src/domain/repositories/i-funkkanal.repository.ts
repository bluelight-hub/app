import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { TransactionContext } from '@domain/common/transaction';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { FunkkanalId } from '@domain/value-objects/funkkanal-id';

/**
 * Eintrag in einem Reorder-Request: kanalId + Ziel-sortIndex.
 */
export interface FunkkanalReorderEntry {
  readonly id: FunkkanalId;
  readonly sortIndex: number;
}

/**
 * Repository-Port (Hexagonale Architektur) für das Funkkanal-Aggregat.
 *
 * Das Interface ist framework-agnostisch. Die konkrete Implementation
 * (`PrismaFunkkanalRepository`) liegt im Infrastructure-Layer und hält die
 * komplette Aggregat-Grenze (Funkkanal + Zuordnungen) in einer Transaktion
 * zusammen mit den Outbox-Events persistent.
 *
 * **Transaktionales Outbox-Pattern:**
 * - `save()` persistiert Kanal + Zuordnungen + emittierte Events in einer TX.
 * - Events werden vom `TransactionalCommandHandler` aus dem Aggregat extrahiert
 *   und in die Outbox geschrieben (Repository ruft `clearDomainEvents()` NICHT).
 *
 * **Archiv statt Hard-Delete:**
 * - Kanäle mit existierenden Funkspruch-ETB-Einträgen dürfen NICHT gelöscht
 *   werden (`hasFunkspruchReferenz`). Der Command-Handler prüft vorher und
 *   archiviert stattdessen.
 */
export interface IFunkkanalRepository {
  /**
   * Speichert ein Funkkanal-Aggregat (Upsert).
   *
   * - Upsert der Root-Entity `Funkkanal`.
   * - Diff der Zuordnungen: neue `INSERT`, entfernte `DELETE`, geänderte `UPDATE`.
   * - `clearDomainEvents()` wird NICHT aufgerufen — Handler extrahiert Events.
   */
  save(aggregate: FunkkanalAggregate, tx?: TransactionContext): Promise<void>;

  /**
   * Lädt ein Funkkanal-Aggregat anhand seiner ID inkl. Zuordnungen.
   */
  findById(id: FunkkanalId, tx?: TransactionContext): Promise<FunkkanalAggregate | null>;

  /**
   * Lädt alle Funkkanäle eines Einsatzes, sortiert nach `sortIndex`.
   *
   * @param opts.includeArchived - Default `false`: archivierte Kanäle werden ausgeblendet.
   */
  findByEinsatzId(einsatzId: EinsatzId, opts?: { includeArchived?: boolean }, tx?: TransactionContext): Promise<FunkkanalAggregate[]>;

  /**
   * Prüft, ob bereits ein Kanal mit dem gleichen Namen im Einsatz existiert
   * (Invariante `@@unique([einsatzId, name])`).
   *
   * @param excludeId - ID die beim Vergleich ausgenommen wird (für Rename-Cases).
   */
  existsByName(einsatzId: EinsatzId, name: string, excludeId?: FunkkanalId, tx?: TransactionContext): Promise<boolean>;

  /**
   * Prüft, ob dieser Kanal bereits in einem Funkspruch-ETB-Eintrag referenziert
   * wird. Wenn ja, darf der Kanal nicht gelöscht (nur archiviert) werden.
   *
   * Query: `etb_eintraege WHERE kontext_type='funkspruch' AND kontext_data->>'kanalId' = $kanalId`.
   */
  hasFunkspruchReferenz(kanalId: FunkkanalId, tx?: TransactionContext): Promise<boolean>;

  /**
   * Hartes Löschen eines Kanals. Precondition: `hasFunkspruchReferenz` === false.
   * Der Application-Layer stellt das sicher; das Repo-Interface ist idempotent.
   */
  delete(id: FunkkanalId, tx?: TransactionContext): Promise<void>;

  /**
   * Bulk-Update der `sortIndex`-Werte mehrerer Kanäle eines Einsatzes in einer TX.
   * Einträge, deren IDs nicht existieren, werden ignoriert.
   */
  reorder(einsatzId: EinsatzId, ordering: ReadonlyArray<FunkkanalReorderEntry>, tx?: TransactionContext): Promise<void>;
}
