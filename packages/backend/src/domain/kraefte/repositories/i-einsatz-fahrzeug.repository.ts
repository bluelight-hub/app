import type { Result } from '@domain/common/result';
import type { EinsatzFahrzeug } from '../aggregates/einsatz-fahrzeug.aggregate';
import type { EinsatzFahrzeugId } from '../value-objects/einsatz-fahrzeug-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für EinsatzFahrzeug Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für EinsatzFahrzeug-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Implementiert von:** PrismaEinsatzFahrzeugRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen
 * mit Outbox Events (AC3: Atomare Event-Persistierung).
 *
 * **Cascade Delete:** EinsatzFahrzeuge werden automatisch mit Einsatz gelöscht
 * (DB Constraint: ON DELETE CASCADE).
 */
export interface IEinsatzFahrzeugRepository {
  /**
   * Speichert ein EinsatzFahrzeug Aggregate (Create oder Update).
   *
   * @param aggregate - Das zu speichernde EinsatzFahrzeug Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  save(aggregate: EinsatzFahrzeug, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet ein Einsatz-Fahrzeug nach ID.
   *
   * @param id - Die EinsatzFahrzeugId
   * @param tx - Optionaler Transaction Context
   * @returns Result<EinsatzFahrzeug | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: EinsatzFahrzeugId, tx?: TransactionContext): Promise<Result<EinsatzFahrzeug | null>>;

  /**
   * Findet alle Einsatz-Fahrzeuge eines Einsatzes.
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param tx - Optionaler Transaction Context
   * @returns Result<EinsatzFahrzeug[]> - Liste aller Fahrzeuge des Einsatzes
   */
  findByEinsatzId(einsatzId: string, tx?: TransactionContext): Promise<Result<EinsatzFahrzeug[]>>;

  /**
   * Prüft ob ein Fahrzeug mit gegebenem Funkrufnamen bereits im Einsatz existiert.
   *
   * **AC4 - Duplikat-Validierung:**
   * Diese Methode wird VOR Erstellung aufgerufen um Unique Constraint
   * Verletzung zu vermeiden (User-freundliche Fehlermeldung statt DB-Error).
   *
   * @param einsatzId - Die Einsatz-ID (UUID)
   * @param funkrufname - Der zu prüfende Funkrufname
   * @param tx - Optionaler Transaction Context
   * @returns Result<boolean> - true wenn Duplikat existiert
   */
  existsByEinsatzIdAndFunkrufname(einsatzId: string, funkrufname: string, tx?: TransactionContext): Promise<Result<boolean>>;
}
