import type { Result } from '@domain/common/result';
import type { EinsatzPerson } from '../aggregates/einsatz-person.aggregate';
import type { EinsatzPersonId } from '../value-objects/einsatz-person-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für EinsatzPerson Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für EinsatzPerson-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaEinsatzPersonRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events (AC5: Atomare Event-Persistierung).
 *
 * **Cascade Delete:** EinsatzPersonen werden automatisch mit Einsatz gelöscht
 * (DB Constraint: ON DELETE CASCADE).
 */
export interface IEinsatzPersonRepository {
  /**
   * Speichert ein EinsatzPerson Aggregate (Create oder Update).
   *
   * @param aggregate - Das zu speichernde EinsatzPerson Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: EinsatzPerson, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet eine Einsatz-Person nach ID.
   *
   * @param id - Die EinsatzPersonId
   * @param tx - Optionaler Transaction Context
   * @returns Result<EinsatzPerson | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: EinsatzPersonId, tx?: TransactionContext): Promise<Result<EinsatzPerson | null>>;

  /**
   * Findet alle Einsatz-Personen eines Einsatzes.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param tx - Optionaler Transaction Context
   * @returns Result<EinsatzPerson[]> - Liste aller Personen des Einsatzes
   */
  findByEinsatzId(einsatzId: string, tx?: TransactionContext): Promise<Result<EinsatzPerson[]>>;

  /**
   * Prüft ob eine StammPerson bereits im Einsatz registriert ist.
   *
   * **AC3 - Duplikat-Validierung:**
   * Diese Methode wird VOR Erstellung aufgerufen um Unique Constraint
   * Verletzung zu vermeiden (User-freundliche Fehlermeldung statt DB-Error).
   * Verhindert doppelte Registrierung derselben StammPerson im gleichen Einsatz.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param stammId - Die zu prüfende StammPerson-ID
   * @param tx - Optionaler Transaction Context
   * @returns Result<boolean> - true wenn Duplikat existiert
   */
  existsByEinsatzIdAndStammId(einsatzId: string, stammId: string, tx?: TransactionContext): Promise<Result<boolean>>;
}
