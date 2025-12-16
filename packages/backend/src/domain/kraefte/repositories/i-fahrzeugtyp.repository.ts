import type { Result } from '@domain/common/result';
import type { Fahrzeugtyp } from '../aggregates/fahrzeugtyp.aggregate';
import type { FahrzeugtypId } from '../value-objects/fahrzeugtyp-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für Fahrzeugtyp Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für Fahrzeugtyp-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaFahrzeugtypRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events.
 */
export interface IFahrzeugtypRepository {
  /**
   * Speichert ein Fahrzeugtyp Aggregate (Create oder Update).
   *
   * @param aggregate - Das zu speichernde Fahrzeugtyp Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: Fahrzeugtyp, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet einen Fahrzeugtyp nach ID.
   *
   * @param id - Die FahrzeugtypId
   * @param tx - Optionaler Transaction Context
   * @returns Result<Fahrzeugtyp | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: FahrzeugtypId, tx?: TransactionContext): Promise<Result<Fahrzeugtyp | null>>;

  /**
   * Findet einen Fahrzeugtyp nach Code (für Uniqueness-Check).
   *
   * @param code - Der eindeutige Code (UPPERCASE)
   * @param tx - Optionaler Transaction Context
   * @returns Result<Fahrzeugtyp | null> - null wenn nicht gefunden
   */
  findByCode(code: string, tx?: TransactionContext): Promise<Result<Fahrzeugtyp | null>>;

  /**
   * Listet alle Fahrzeugtypen mit optionalem Filter.
   *
   * @param filter - Optionaler Filter (istAktiv)
   * @param tx - Optionaler Transaction Context
   * @returns Result<Fahrzeugtyp[]> - Liste aller Fahrzeugtypen
   */
  findAll(filter?: { istAktiv?: boolean }, tx?: TransactionContext): Promise<Result<Fahrzeugtyp[]>>;

  /**
   * Prüft ob ein Fahrzeugtyp mit gegebener ID existiert.
   *
   * @param id - Die FahrzeugtypId
   * @param tx - Optionaler Transaction Context
   * @returns Result<boolean> - true wenn vorhanden
   */
  exists(id: FahrzeugtypId, tx?: TransactionContext): Promise<Result<boolean>>;
}
