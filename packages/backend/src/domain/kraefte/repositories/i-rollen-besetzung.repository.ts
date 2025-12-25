import type { Result } from '@domain/common/result';
import type { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { RolleId } from '../value-objects/rolle-id';
import type { RollenBesetzungId } from '../value-objects/rollen-besetzung-id';
import type { RollenBesetzung } from '../aggregates/rollen-besetzung.aggregate';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

// Re-export for convenience in Application Layer
export type { RollenBesetzung };

/**
 * Repository Port für RollenBesetzung Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für Rollenbesetzung-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaRollenBesetzungRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events (AC5: Atomare Event-Persistierung).
 *
 * **Cascade Delete:** Rollenbesetzungen werden automatisch mit Einsatz gelöscht
 * (DB Constraint: ON DELETE CASCADE).
 *
 * **UNIQUE Constraint (AC2):** Pro Einsatz kann jede Rolle nur EINMAL besetzt werden.
 * Verhindert durch DB-Constraint: `@@unique([einsatzId, rollenDefinitionId])`
 */
export interface IRollenBesetzungRepository {
  /**
   * Speichert eine Rollenbesetzung (Create oder Update).
   *
   * **Fehlerbehandlung:**
   * - P2002 (Unique Constraint) → ROLLE_ALREADY_BESETZT
   * - P2003 (FK Constraint) → PERSON_NOT_FOUND / ROLLE_NOT_FOUND
   *
   * @param aggregate - Das zu speichernde RollenBesetzung Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: RollenBesetzung, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet eine Rollenbesetzung nach ID.
   *
   * @param id - Die RollenBesetzungId
   * @param tx - Optionaler Transaction Context
   * @returns Result<RollenBesetzung | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: RollenBesetzungId, tx?: TransactionContext): Promise<Result<RollenBesetzung | null>>;

  /**
   * Findet alle Rollenbesetzungen eines Einsatzes.
   *
   * **Use Case:** Dashboard Rollen-Übersicht für Einsatz X.
   *
   * @param einsatzId - Die Einsatz-ID (CUID2)
   * @param tx - Optionaler Transaction Context
   * @returns Result<RollenBesetzung[]> - Liste aller Besetzungen des Einsatzes
   */
  findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<RollenBesetzung[]>>;

  /**
   * Findet eine spezifische Rollenbesetzung in einem Einsatz.
   *
   * **AC2 Duplikat-Validierung:**
   * Diese Methode wird VOR Erstellung aufgerufen um UNIQUE Constraint
   * Verletzung zu vermeiden (User-freundliche Fehlermeldung statt DB-Error).
   * Verhindert doppelte Besetzung derselben Rolle im gleichen Einsatz.
   *
   * @param einsatzId - Die Einsatz-ID (CUID2)
   * @param rolleId - Die RollenDefinition-ID (CUID2)
   * @param tx - Optionaler Transaction Context
   * @returns Result<RollenBesetzung | null> - null wenn Rolle noch frei
   */
  findByEinsatzIdAndRolleId(einsatzId: EinsatzId, rolleId: RolleId, tx?: TransactionContext): Promise<Result<RollenBesetzung | null>>;

  /**
   * Löscht eine Rollenbesetzung (Rolle wird freigegeben).
   *
   * **Story 5.2 - GibRolleFrei Command:**
   * Entfernt Person von Rolle, Rolle wird wieder verfügbar für Zuweisung.
   *
   * @param id - Die RollenBesetzungId
   * @param tx - Optionaler Transaction Context
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  delete(id: RollenBesetzungId, tx?: TransactionContext): Promise<Result<void>>;
}
