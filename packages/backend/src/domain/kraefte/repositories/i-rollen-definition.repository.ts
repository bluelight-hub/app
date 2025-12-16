import type { Result } from '@domain/common/result';
import type { RollenDefinition } from '../aggregates/rollen-definition.aggregate';
import type { RolleId } from '../value-objects/rolle-id';

/**
 * Opaker Transaktionskontext für Framework-Agnostizität.
 *
 * Der Domain Layer kennt die konkrete Implementierung nicht (Prisma.TransactionClient).
 * Infrastructure Layer castet diesen Typ zur Laufzeit.
 */
export type TransactionContext = unknown;

/**
 * Repository-Interface für RollenDefinition Aggregate.
 *
 * Definiert die Persistenz-Operationen für Rollen im Domain Layer.
 * Implementierung erfolgt in Infrastructure Layer (PrismaRollenDefinitionRepository).
 *
 * @remarks
 * - Alle Methoden geben Result<T> zurück (keine Exceptions für erwartete Fehler)
 * - "Not found" ist Success mit null (nicht Failure)
 * - TransactionContext ermöglicht atomare Multi-Aggregate-Operationen
 */
export interface IRollenDefinitionRepository {
  /**
   * Persistiert eine RollenDefinition (Create oder Update via Upsert).
   *
   * @param aggregate - Die zu speichernde RollenDefinition
   * @param tx - Optionaler Transaktionskontext für atomare Operationen
   * @returns Result.ok() bei Erfolg, Result.fail() bei Persistenzfehler
   */
  save(aggregate: RollenDefinition, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Speichert die M:N-Beziehungen zwischen Rolle und Qualifikationen.
   *
   * Diese Methode erstellt die Junction-Table-Einträge (RolleQualifikation).
   * Wird separat von save() aufgerufen da Junction-Einträge eigene Audit-Felder haben.
   *
   * @param rolleId - ID der RollenDefinition
   * @param qualifikationIds - IDs der zu verknüpfenden Qualifikationen
   * @param createdBy - User-ID für Audit-Trail
   * @param tx - Transaktionskontext (sollte mit save() identisch sein)
   */
  saveQualifikationen(rolleId: RolleId, qualifikationIds: string[], createdBy: string, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Löscht alle Qualifikations-Verknüpfungen für eine Rolle.
   *
   * Wird vor saveQualifikationen() aufgerufen um REPLACE-Semantik zu implementieren
   * (bestehende Verknüpfungen werden ersetzt, nicht gemergt).
   *
   * @param rolleId - ID der RollenDefinition
   * @param tx - Transaktionskontext
   */
  deleteQualifikationen(rolleId: RolleId, tx?: TransactionContext): Promise<Result<void>>;

  /**
   * Findet eine RollenDefinition anhand ihrer ID.
   *
   * @param id - Die RolleId der gesuchten Rolle
   * @param tx - Optionaler Transaktionskontext
   * @returns Result.ok(RollenDefinition) wenn gefunden, Result.ok(null) wenn nicht gefunden
   */
  findById(id: RolleId, tx?: TransactionContext): Promise<Result<RollenDefinition | null>>;

  /**
   * Findet eine RollenDefinition anhand ihres Namens.
   *
   * Verwendet für Uniqueness-Checks vor Create/Update.
   *
   * @param name - Der exakte Name (case-sensitive, trimmed)
   * @param tx - Optionaler Transaktionskontext
   * @returns Result.ok(RollenDefinition) wenn gefunden, Result.ok(null) wenn nicht gefunden
   */
  findByName(name: string, tx?: TransactionContext): Promise<Result<RollenDefinition | null>>;

  /**
   * Findet alle RollenDefinitionen mit optionalem Filter.
   *
   * @param filter - Optionale Filter-Kriterien (z.B. istAktiv)
   * @param tx - Optionaler Transaktionskontext
   * @returns Result.ok(RollenDefinition[]) - leeres Array wenn keine gefunden
   */
  findAll(filter?: { istAktiv?: boolean }, tx?: TransactionContext): Promise<Result<RollenDefinition[]>>;

  /**
   * Prüft ob eine RollenDefinition mit gegebener ID existiert.
   *
   * Optimierte Methode für Existenz-Checks ohne vollständiges Laden.
   *
   * @param id - Die RolleId der zu prüfenden Rolle
   * @param tx - Optionaler Transaktionskontext
   * @returns Result.ok(boolean) - true wenn existiert
   */
  exists(id: RolleId, tx?: TransactionContext): Promise<Result<boolean>>;
}
