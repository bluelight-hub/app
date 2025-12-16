import type { Result } from '@domain/common/result';
import type { StammPerson } from '../aggregates/stamm-person.aggregate';
import type { StammPersonId } from '../value-objects/stamm-person-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für StammPerson Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für StammPerson-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaStammPersonRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events.
 *
 * **Filter Options:**
 * - includeArchived: Steuert ob archivierte Personen inkludiert werden (default: false)
 */
export interface IStammPersonRepository {
  /**
   * Speichert eine StammPerson Aggregate (Create oder Update).
   *
   * Bei Update werden auch die M:N Qualifikationen synchronisiert:
   * - Alte Verknüpfungen werden gelöscht
   * - Neue Verknüpfungen werden erstellt
   *
   * @param aggregate - Die zu speichernde StammPerson Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: StammPerson, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet eine Stamm-Person nach ID.
   *
   * Lädt auch alle zugehörigen Qualifikation-IDs (M:N Join).
   *
   * @param id - Die StammPersonId
   * @param tx - Optionaler Transaction Context
   * @returns Result<StammPerson | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: StammPersonId, tx?: TransactionContext): Promise<Result<StammPerson | null>>;

  /**
   * Findet eine Stamm-Person nach Personalnummer (für Uniqueness-Check).
   *
   * @param personalnummer - Die eindeutige Personalnummer
   * @param tx - Optionaler Transaction Context
   * @returns Result<StammPerson | null> - null wenn nicht gefunden
   */
  findByPersonalnummer(personalnummer: string, tx?: TransactionContext): Promise<Result<StammPerson | null>>;

  /**
   * Listet alle Stamm-Personen mit optionalem Filter.
   *
   * @param filter - Optional filter options
   * @param filter.includeArchived - Ob archivierte Personen inkludiert werden sollen (default: false)
   * @param tx - Optionaler Transaction Context
   * @returns Result<StammPerson[]> - Liste aller Stamm-Personen
   */
  findAll(filter?: { includeArchived?: boolean }, tx?: TransactionContext): Promise<Result<StammPerson[]>>;

  /**
   * Prüft ob eine Stamm-Person mit gegebener Personalnummer existiert.
   *
   * @param personalnummer - Die zu prüfende Personalnummer
   * @param tx - Optionaler Transaction Context
   * @returns Result<boolean> - true wenn vorhanden
   */
  exists(personalnummer: string, tx?: TransactionContext): Promise<Result<boolean>>;
}
