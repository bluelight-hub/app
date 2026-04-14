import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { TaktischesZeichen } from '../aggregates/taktisches-zeichen.aggregate';

/**
 * Repository Port Interface für TaktischesZeichen Aggregate Persistenz.
 *
 * Definiert die Abstraktion zwischen Domain Layer und Infrastructure Layer.
 * Implementierung erfolgt im Infrastructure Layer via Prisma Repository Adapter.
 *
 * **Design Constraints:**
 * - KEINE Prisma Types in Signaturen (verhindert Domain-Layer-Kontamination)
 * - Result<T> Pattern für explizite Fehlerbehandlung
 * - Alle Methoden async (I/O-Grenze)
 * - TransactionContext für atomare Persistierung mit Outbox
 */
export interface ITaktischesZeichenRepository {
  /**
   * Speichert ein TaktischesZeichen Aggregate (Create oder Update).
   *
   * @param zeichen - Das zu speichernde Aggregate
   * @param tx - Optionaler Transaction Context für atomare Operationen
   * @returns Result<void> - Erfolg oder Fehler mit Meldung
   */
  save(zeichen: TaktischesZeichen, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet ein TaktischesZeichen Aggregate anhand seiner ID.
   *
   * @param id - CUID-String der Zeichen-ID
   * @returns Result<TaktischesZeichen | null> - Aggregate oder null wenn nicht gefunden
   */
  findById(id: string): Promise<Result<TaktischesZeichen | null>>;

  /**
   * Findet alle taktischen Zeichen eines Einsatzes.
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Result<TaktischesZeichen[]> - Liste aller Zeichen (leer wenn keine vorhanden)
   */
  findByEinsatzId(einsatzId: string): Promise<Result<TaktischesZeichen[]>>;

  /**
   * Findet alle taktischen Zeichen einer Lagekarte.
   *
   * @param lagekarteId - ID der Lagekarte
   * @returns Result<TaktischesZeichen[]> - Liste aller platzierten Zeichen (leer wenn keine vorhanden)
   */
  findByLagekarteId(lagekarteId: string): Promise<Result<TaktischesZeichen[]>>;

  /**
   * Findet taktische Zeichen anhand einer Referenz-Verknüpfung (z.B. EINHEIT, FAHRZEUG).
   *
   * @param referenzTyp - Typ der verknüpften Ressource (z.B. 'EINHEIT', 'FAHRZEUG')
   * @param referenzId - ID der verknüpften Ressource
   * @param tx - Optionaler Transaction Context
   * @returns Result<TaktischesZeichen[]> - Verknüpfte Zeichen (leer wenn keine vorhanden)
   */
  findByReferenz(referenzTyp: string, referenzId: string, tx?: TransactionContext): Promise<Result<TaktischesZeichen[]>>;

  /**
   * Löscht ein taktisches Zeichen permanent aus der Datenbank.
   *
   * @param id - CUID-String der Zeichen-ID
   * @param tx - Optionaler Transaction Context für atomare Operationen
   * @returns Result<void> - Erfolg oder Fehler mit Meldung
   */
  delete(id: string, tx?: TransactionContext): Promise<Result<void>>;
}
