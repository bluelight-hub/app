import type { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import type { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';

/**
 * Repository Interface fuer Kategorie Aggregate.
 */
export interface IKategorieRepository {
  /**
   * Speichert eine Kategorie (Create oder Update).
   * @param kategorie - Die zu speichernde Kategorie
   * @param tx - Optionale Transaction fuer atomare Operationen
   */
  save(kategorie: Kategorie, tx?: unknown): Promise<void>;

  /**
   * Findet eine Kategorie anhand ihrer ID.
   * @param id - Die KategorieId
   * @param tx - Optionale Transaction fuer atomare Operationen
   * @returns Die gefundene Kategorie oder null
   */
  findById(id: KategorieId, tx?: unknown): Promise<Kategorie | null>;

  /**
   * Findet alle Kategorien eines Einsatzes (inkl. geloeschter).
   * @param einsatzId - Die EinsatzId
   * @returns Array aller Kategorien des Einsatzes
   */
  findByEinsatzId(einsatzId: string): Promise<Kategorie[]>;

  /**
   * Prüft ob eine Kategorie mit dem Namen bereits im Einsatz existiert.
   * @param name - Der Kategoriename
   * @param einsatzId - Die EinsatzId
   * @returns true wenn Kategorie existiert, sonst false
   */
  existsByNameAndEinsatzId(name: string, einsatzId: string): Promise<boolean>;

  /**
   * Löscht eine Kategorie (Hard-Delete).
   * @param kategorie - Die zu loeschende Kategorie
   * @param tx - Optionale Transaction fuer atomare Operationen
   */
  delete(kategorie: Kategorie, tx?: unknown): Promise<void>;
}
