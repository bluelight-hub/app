/**
 * Logger Port - Framework-agnostic Logging Interface.
 *
 * Dieser Port ermöglicht Logging im Application Layer ohne direkte Abhängigkeit
 * von NestJS Logger. Der Infrastructure Layer stellt einen Adapter bereit,
 * der diesen Port mit dem konkreten Logger-Framework (z.B. NestJS Logger) verbindet.
 *
 * **Clean Architecture:**
 * - Domain/Application Layer hängen von diesem Port ab (Dependency Inversion)
 * - Infrastructure Layer implementiert diesen Port mit konkreter Logger-Bibliothek
 * - Ermöglicht einfaches Testen (Mock Logger) und Framework-Unabhängigkeit
 *
 * **Log Levels:**
 * - log: Standard-Informationen (INFO)
 * - error: Fehler mit hoher Priorität (ERROR)
 * - warn: Warnungen (WARN)
 * - debug: Debug-Informationen (DEBUG)
 *
 * @module domain/ports
 * @see NestLoggerAdapter - Infrastructure Adapter für NestJS Logger
 */

/**
 * Framework-agnostisches Logger Interface.
 *
 * Verwendet von Application Layer Handlers, die Logging benötigen,
 * ohne direkte Abhängigkeit von NestJS Logger zu haben.
 */
export interface ILogger {
  /**
   * Loggt Standard-Informationen (INFO level).
   *
   * @param message - Die Lognachricht
   * @param context - Optional: Zusätzliche Kontextinformationen (Objekt oder String)
   */
  log(message: string, context?: unknown): void;

  /**
   * Loggt Fehler (ERROR level).
   *
   * Sollte für schwerwiegende Fehler verwendet werden, die Alerting/Monitoring erfordern.
   *
   * @param message - Die Fehlernachricht
   * @param context - Optional: Zusätzliche Kontextinformationen (Objekt oder String)
   */
  error(message: string, context?: unknown): void;

  /**
   * Loggt Warnungen (WARN level).
   *
   * Sollte für potenzielle Probleme verwendet werden, die keine sofortige Aktion erfordern.
   *
   * @param message - Die Warnmeldung
   * @param context - Optional: Zusätzliche Kontextinformationen (Objekt oder String)
   */
  warn(message: string, context?: unknown): void;

  /**
   * Loggt Debug-Informationen (DEBUG level).
   *
   * Sollte für detaillierte Informationen verwendet werden, die bei Debugging hilfreich sind.
   * In Production-Umgebungen kann DEBUG-Level deaktiviert sein.
   *
   * @param message - Die Debug-Nachricht
   * @param context - Optional: Zusätzliche Kontextinformationen (Objekt oder String)
   */
  debug(message: string, context?: unknown): void;
}
