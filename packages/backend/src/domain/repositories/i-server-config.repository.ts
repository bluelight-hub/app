import type { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';

/**
 * Server-Konfigurationsdaten für Persistenz und Domain Layer.
 *
 * **Singleton-Pattern:**
 * - id ist immer "singleton" (nur eine Zeile pro Server)
 * - insecureMode bestimmt ob Server im unsicheren Modus läuft
 * - migratedAt wird gesetzt wenn Migration zu SECURE Mode erfolgt
 */
export interface ServerConfig {
  /** Singleton ID - immer "singleton" */
  readonly id: string;
  /** true = Server akzeptiert alle Requests ohne Authentifizierung */
  insecureMode: boolean;
  /** Zeitpunkt der Migration von INSECURE zu SECURE Mode (null = noch nicht migriert) */
  migratedAt: Date | null;
  /** Erstellungszeitpunkt */
  readonly createdAt: Date;
  /** Letzter Aktualisierungszeitpunkt */
  updatedAt: Date;
}

/**
 * Update-DTO für ServerConfig.
 * Nur mutable Felder können aktualisiert werden.
 */
export interface ServerConfigUpdate {
  /** Neuer Wert für insecureMode */
  insecureMode?: boolean;
  /** Zeitpunkt der Migration (wird bei SECURE Migration gesetzt) */
  migratedAt?: Date | null;
}

/**
 * Repository Port Interface für ServerConfig (Hexagonal Architecture).
 *
 * Verwaltet die Singleton-Server-Konfiguration für:
 * - INSECURE/SECURE Mode Status
 * - Migrations-Tracking (wann wurde zu SECURE migriert)
 *
 * **Singleton-Strategie:**
 * - getOrCreate() garantiert dass immer genau eine Konfiguration existiert
 * - Kein delete() - Konfiguration wird nie gelöscht
 * - update() aktualisiert die existierende Singleton-Zeile
 *
 * **Use Cases (Story 4.6):**
 * - AC1: INSECURE Mode Status prüfen
 * - AC3: Migration zu SECURE Mode durchführen
 * - AC5: Migrations-Zeitpunkt tracken
 *
 * @example
 * ```typescript
 * // In Application Layer (Use Case)
 * async migrateToSecure(): Promise<Result<void>> {
 *   const config = await this.configRepo.getOrCreate();
 *   if (config.isFailure) return Result.fail(config.error);
 *
 *   if (!config.value.insecureMode) {
 *     return Result.fail('Already in SECURE mode');
 *   }
 *
 *   await this.configRepo.update({
 *     insecureMode: false,
 *     migratedAt: new Date()
 *   });
 *
 *   return Result.ok(undefined);
 * }
 * ```
 */
export interface IServerConfigRepository {
  /**
   * Lädt die Server-Konfiguration oder erstellt sie mit Standardwerten.
   *
   * **Singleton-Garantie:**
   * - Gibt immer genau eine Konfiguration zurück
   * - Bei erstem Aufruf wird Konfiguration mit insecureMode=true erstellt
   * - Folgende Aufrufe liefern die existierende Konfiguration
   *
   * **Default-Werte bei Erstellung:**
   * - id: "singleton"
   * - insecureMode: true
   * - migratedAt: null
   *
   * @param tx - Optional Transaction Context für atomare Operationen
   * @returns Result<ServerConfig> - Success mit Konfiguration oder Failure bei DB-Fehler
   */
  getOrCreate(tx?: TransactionContext): Promise<Result<ServerConfig>>;

  /**
   * Aktualisiert die Server-Konfiguration.
   *
   * **Voraussetzung:**
   * - Konfiguration muss existieren (via getOrCreate() sichergestellt)
   *
   * **Typische Updates:**
   * - insecureMode: false (Migration zu SECURE Mode)
   * - migratedAt: new Date() (Migrations-Zeitpunkt setzen)
   *
   * @param update - Partielle Update-Daten (nur geänderte Felder)
   * @param tx - Optional Transaction Context für atomare Operationen
   * @returns Result<ServerConfig> - Success mit aktualisierter Konfiguration oder Failure
   */
  update(update: ServerConfigUpdate, tx?: TransactionContext): Promise<Result<ServerConfig>>;

  /**
   * Prüft ob der Server im INSECURE Mode läuft.
   *
   * **Convenience-Methode:**
   * - Equivalent zu: getOrCreate().value.insecureMode
   * - Cached für Performance (innerhalb einer Request-Transaktion)
   *
   * **Use Case:**
   * - Schnelle Prüfung in Guards und Middlewares
   * - Vermeidet vollständiges Laden der Konfiguration
   *
   * @param tx - Optional Transaction Context
   * @returns Result<boolean> - true wenn insecureMode aktiv
   */
  isInsecureMode(tx?: TransactionContext): Promise<Result<boolean>>;

  /**
   * Prüft ob bereits eine Migration zu SECURE Mode stattgefunden hat.
   *
   * **Convenience-Methode:**
   * - Equivalent zu: getOrCreate().value.migratedAt !== null
   *
   * **Use Case:**
   * - Prüfen ob Re-Aktivierung von INSECURE Mode möglich ist
   * - Audit-Trail für Sicherheitsänderungen
   *
   * @param tx - Optional Transaction Context
   * @returns Result<boolean> - true wenn migratedAt gesetzt ist
   */
  hasMigrated(tx?: TransactionContext): Promise<Result<boolean>>;
}
