import type { Result } from '@domain/common/result';
import type { EinsatzEinheit } from '../aggregates/einsatz-einheit.aggregate';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für EinsatzEinheit Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für EinsatzEinheit-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaEinsatzEinheitRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events (AC5: Atomare Event-Persistierung).
 *
 * **Cascade Delete:** EinsatzEinheiten werden automatisch mit Einsatz gelöscht
 * (DB Constraint: ON DELETE CASCADE).
 */
export interface IEinsatzEinheitRepository {
  /**
   * Speichert ein EinsatzEinheit Aggregate (Create oder Update).
   *
   * @param einheit - Das zu speichernde EinsatzEinheit Aggregate
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(einheit: EinsatzEinheit, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Findet eine EinsatzEinheit nach ID.
   *
   * @param id - Die EinsatzEinheit-ID (CUID2)
   * @param tx - Optionaler Transaction Context
   * @returns Result<EinsatzEinheit | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: string, tx?: TransactionContext): Promise<Result<EinsatzEinheit | null>>;

  /**
   * Findet alle EinsatzEinheiten eines Einsatzes.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @returns Result<EinsatzEinheit[]> - Liste aller Einheiten des Einsatzes
   */
  findByEinsatzId(einsatzId: string): Promise<Result<EinsatzEinheit[]>>;

  /**
   * Löscht eine EinsatzEinheit nach ID.
   *
   * @param id - Die EinsatzEinheit-ID (CUID2)
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  delete(id: string, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Prüft ob eine Person bereits einer Einheit zugewiesen ist.
   *
   * @param personId - Die EinsatzPerson-ID (CUID2)
   * @param einheitId - Die EinsatzEinheit-ID (CUID2)
   * @param tx - Optionaler Transaction Context
   * @returns true wenn Zuordnung existiert
   */
  existsPersonenZuordnung(personId: string, einheitId: string, tx?: TransactionContext): Promise<boolean>;

  /**
   * Speichert eine Personen-Zuordnung zu einer Einheit.
   *
   * @param personId - Die EinsatzPerson-ID (CUID2)
   * @param einheitId - Die EinsatzEinheit-ID (CUID2)
   * @param createdBy - User-ID für Audit-Trail
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  savePersonenZuordnung(personId: string, einheitId: string, createdBy: string, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Entfernt eine Personen-Zuordnung von einer Einheit.
   *
   * @param personId - Die EinsatzPerson-ID (CUID2)
   * @param einheitId - Die EinsatzEinheit-ID (CUID2)
   * @param tx - Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  removePersonenZuordnung(personId: string, einheitId: string, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Zählt die untergeordneten Einheiten (Children) einer Einheit.
   *
   * @param einheitId - Die EinsatzEinheit-ID (CUID2)
   * @param tx - Optionaler Transaction Context
   * @returns Anzahl der untergeordneten Einheiten
   */
  countChildren(einheitId: string, tx?: TransactionContext): Promise<number>;

  /**
   * Zählt die zugewiesenen Personen einer Einheit.
   *
   * @param einheitId - Die EinsatzEinheit-ID (CUID2)
   * @param tx - Optionaler Transaction Context
   * @returns Anzahl der zugewiesenen Personen
   */
  countPersonen(einheitId: string, tx?: TransactionContext): Promise<number>;
}
