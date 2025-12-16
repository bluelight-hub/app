import type { Result } from '@domain/common/result';
import type { StammFahrzeug } from '../aggregates/stamm-fahrzeug.aggregate';
import type { StammFahrzeugId } from '../value-objects/stamm-fahrzeug-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für StammFahrzeug Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für StammFahrzeug-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaStammFahrzeugRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events.
 */
export interface IStammFahrzeugRepository {
  /**
   * Speichert ein StammFahrzeug Aggregate (Create oder Update).
   *
   * @param aggregate - Das zu speichernde StammFahrzeug Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: StammFahrzeug, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet ein Stamm-Fahrzeug nach ID.
   *
   * @param id - Die StammFahrzeugId
   * @param tx - Optionaler Transaction Context
   * @returns Result<StammFahrzeug | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: StammFahrzeugId, tx?: TransactionContext): Promise<Result<StammFahrzeug | null>>;

  /**
   * Findet ein Stamm-Fahrzeug nach Funkrufname (für Uniqueness-Check).
   *
   * @param funkrufname - Der eindeutige Funkrufname
   * @param tx - Optionaler Transaction Context
   * @returns Result<StammFahrzeug | null> - null wenn nicht gefunden
   */
  findByFunkrufname(funkrufname: string, tx?: TransactionContext): Promise<Result<StammFahrzeug | null>>;

  /**
   * Listet alle Stamm-Fahrzeuge mit optionalem Filter.
   *
   * @param includeArchived - Ob archivierte Fahrzeuge inkludiert werden sollen (default: false)
   * @param tx - Optionaler Transaction Context
   * @returns Result<StammFahrzeug[]> - Liste aller Stamm-Fahrzeuge
   */
  findAll(includeArchived?: boolean, tx?: TransactionContext): Promise<Result<StammFahrzeug[]>>;

  /**
   * Prüft ob ein Stamm-Fahrzeug mit gegebener Funkrufname existiert.
   *
   * @param funkrufname - Der zu prüfende Funkrufname
   * @param tx - Optionaler Transaction Context
   * @returns Result<boolean> - true wenn vorhanden
   */
  exists(funkrufname: string, tx?: TransactionContext): Promise<Result<boolean>>;
}
