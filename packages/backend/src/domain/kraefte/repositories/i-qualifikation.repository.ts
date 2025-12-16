import type { Result } from '@domain/common/result';
import type { Qualifikation } from '../aggregates/qualifikation.aggregate';
import type { QualifikationId } from '../value-objects/qualifikation-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für Qualifikation Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für Qualifikation-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaQualifikationRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events.
 */
export interface IQualifikationRepository {
  /**
   * Speichert ein Qualifikation Aggregate (Create oder Update).
   *
   * @param aggregate - Das zu speichernde Qualifikation Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: Qualifikation, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet eine Qualifikation nach ID.
   *
   * @param id - Die QualifikationId
   * @param tx - Optionaler Transaction Context
   * @returns Result<Qualifikation | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: QualifikationId, tx?: TransactionContext): Promise<Result<Qualifikation | null>>;

  /**
   * Findet eine Qualifikation nach Abkürzung (für Uniqueness-Check).
   *
   * @param abkuerzung - Die eindeutige Abkürzung
   * @param tx - Optionaler Transaction Context
   * @returns Result<Qualifikation | null> - null wenn nicht gefunden
   */
  findByAbkuerzung(abkuerzung: string, tx?: TransactionContext): Promise<Result<Qualifikation | null>>;

  /**
   * Listet alle Qualifikationen mit optionalem Filter.
   *
   * @param filter - Optionaler Filter (istAktiv)
   * @param tx - Optionaler Transaction Context
   * @returns Result<Qualifikation[]> - Liste aller Qualifikationen
   */
  findAll(filter?: { istAktiv?: boolean }, tx?: TransactionContext): Promise<Result<Qualifikation[]>>;

  /**
   * Prüft ob eine Qualifikation mit gegebener ID existiert.
   *
   * @param id - Die QualifikationId
   * @param tx - Optionaler Transaction Context
   * @returns Result<boolean> - true wenn vorhanden
   */
  exists(id: QualifikationId, tx?: TransactionContext): Promise<Result<boolean>>;

  /**
   * Prüft Existenz mehrerer Qualifikationen in einer einzelnen Datenbankabfrage.
   *
   * Performance-Optimierung: Single SELECT...WHERE IN() Query verhindert N+1 Problem
   * im Vergleich zu mehreren einzelnen exists() Aufrufen.
   *
   * @param ids - Array von QualifikationIds zum Batch-Check
   * @param tx - Optionaler Transaction Context für atomare Operationen
   * @returns Result mit allExist (boolean) und missing (fehlende IDs als string[])
   */
  existsMany(ids: QualifikationId[], tx?: TransactionContext): Promise<Result<{ allExist: boolean; missing: string[] }>>;
}
