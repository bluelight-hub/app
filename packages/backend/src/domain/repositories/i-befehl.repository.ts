import type { Befehl } from '@domain/aggregates/befehl.aggregate';
import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { BefehlId } from '@domain/value-objects/befehl-id';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';

/**
 * Repository Port Interface für Befehl Aggregate Persistence.
 *
 * Definiert die Abstraktion zwischen Domain Layer und Infrastructure Layer.
 * Implementierung erfolgt in Infrastructure Layer (Story 1.4) via Prisma Repository Adapter.
 *
 * **Design Constraints:**
 * - KEINE Prisma Types in Signaturen
 * - Result<T> Pattern für explizite Error Handling
 * - Alle Methods async (I/O Boundary)
 * - NO delete() Method (Append-Only Policy, GoBD-Compliance)
 */
export interface IBefehlRepository {
  /**
   * Speichert ein Befehl Aggregate (Create oder Update).
   * Transaction Support via optionalem tx Parameter (Transactional Outbox Pattern).
   */
  save(befehl: Befehl, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet ein Befehl Aggregate by ID.
   * Gibt null zurück wenn nicht gefunden (kein Error).
   */
  findById(id: BefehlId, tx?: TransactionContext): Promise<Result<Befehl | null>>;

  /**
   * Findet alle Befehle eines Einsatzes.
   * Sortierung nach erteiltAm DESC (neueste zuerst).
   */
  findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<Befehl[]>>;

  /**
   * HINWEIS: KEINE delete() Method!
   * Append-Only Policy: GoBD-Compliance erfordert lückenlose Befehlshistorie.
   * Befehle können NIEMALS gelöscht werden.
   */
}
