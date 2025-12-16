import type { Result } from '@domain/common/result';
import type { FunkStatusConfig } from '../aggregates/funk-status-config.aggregate';
import type { FunkStatusConfigId } from '../value-objects/funk-status-config-id';

/**
 * Opaque Transaction Context für Infrastructure Layer.
 * Ermöglicht atomare Operationen ohne Framework-Abhängigkeit im Domain Layer.
 */
export type TransactionContext = unknown;

/**
 * Repository Port für FunkStatusConfig Aggregate (Hexagonal Architecture).
 *
 * Definiert die Schnittstelle für FunkStatusConfig-Persistierung ohne
 * Abhängigkeit von konkreter Implementierung (Prisma, etc.).
 *
 * **Config-Only Pattern:**
 * - KEIN save() - FunkStatusConfig wird NICHT neu erstellt, nur aktualisiert
 * - KEIN delete() - FunkStatusConfig ist permanente System-Konfiguration
 * - NUR findAll(), findByCode(), update()
 *
 * **Implementiert von:** PrismaFunkStatusConfigRepository in Infrastructure Layer.
 *
 * **Result Pattern:** Alle Methoden geben Result<T> zurück für explizite
 * Fehlerbehandlung ohne Exceptions.
 *
 * **Transaction Support:** Optionaler `tx` Parameter für atomare Operationen.
 */
export interface IFunkStatusConfigRepository {
  /**
   * Listet alle FunkStatusConfig Einträge (Status 0-9).
   *
   * Verwendet für Konfigurations-UI (Liste aller Status) und Seed-Status-Check.
   *
   * @param tx - Optionaler Transaction Context
   * @returns Result<FunkStatusConfig[]> - Liste aller FunkStatusConfig Einträge
   */
  findAll(tx?: TransactionContext): Promise<Result<FunkStatusConfig[]>>;

  /**
   * Findet eine FunkStatusConfig nach Status-Code (0-9).
   *
   * Verwendet für Einzelansicht und Update-Validierung.
   *
   * @param code - Der Status-Code (0-9)
   * @param tx - Optionaler Transaction Context
   * @returns Result<FunkStatusConfig | null> - null wenn nicht gefunden (kein Error)
   */
  findByCode(code: number, tx?: TransactionContext): Promise<Result<FunkStatusConfig | null>>;

  /**
   * Findet eine FunkStatusConfig nach ID.
   *
   * @param id - Die FunkStatusConfigId
   * @param tx - Optionaler Transaction Context
   * @returns Result<FunkStatusConfig | null> - null wenn nicht gefunden (kein Error)
   */
  findById(id: FunkStatusConfigId, tx?: TransactionContext): Promise<Result<FunkStatusConfig | null>>;

  /**
   * Aktualisiert eine bestehende FunkStatusConfig.
   *
   * **WICHTIG:** KEIN save() - FunkStatusConfig wird NICHT neu erstellt!
   * Funkstatus werden via Seed/Migration erstellt und dann NUR aktualisiert.
   *
   * @param aggregate - Das zu aktualisierende FunkStatusConfig Aggregate
   * @param tx - Optionaler Transaction Context für atomare Persistierung
   * @returns Result<void> - Success oder Failure mit Fehlermeldung
   */
  update(aggregate: FunkStatusConfig, tx?: TransactionContext): Promise<Result<void>>;
}
