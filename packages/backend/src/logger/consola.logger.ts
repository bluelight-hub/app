import { LoggerService, LogLevel } from '@nestjs/common';
import { consola } from 'consola';

/**
 * Vorkonfigurierte Consola-Logger-Instanz für anwendungsweite Nutzung.
 * Setzt das Log-Level basierend auf der Umgebung (Produktion: 3, Entwicklung: 4).
 */
export const logger = consola.create({
  level: process.env.NODE_ENV === 'production' ? 3 : 4,
});

/**
 * NestJS-Logger-Implementierung mit Consola.
 * Stellt Standard-Logging-Methoden bereit, die auf die Consola-API abgebildet werden.
 *
 * @class ConsolaLogger
 * @implements {LoggerService}
 */
export class ConsolaLogger implements LoggerService {
  /**
   * Erstellt eine Instanz des ConsolaLoggers.
   */
  constructor() {}

  /**
   * Protokolliert eine Nachricht auf dem 'log'-Level.
   *
   * @param {any} message - Die zu protokollierende Nachricht
   * @param {any[]} optionalParams - Zusätzliche zu protokollierende Parameter
   */
  log(message: any, ...optionalParams: any[]) {
    logger.log(message, ...optionalParams);
  }

  /**
   * Protokolliert eine Nachricht auf dem 'error'-Level.
   *
   * @param {any} message - Die zu protokollierende Fehlermeldung
   * @param {any[]} optionalParams - Zusätzliche zu protokollierende Parameter
   */
  error(message: any, ...optionalParams: any[]) {
    logger.error(message, ...optionalParams);
  }

  /**
   * Protokolliert eine Nachricht auf dem 'warn'-Level.
   *
   * @param {any} message - Die zu protokollierende Warnmeldung
   * @param {any[]} optionalParams - Zusätzliche zu protokollierende Parameter
   */
  warn(message: any, ...optionalParams: any[]) {
    logger.warn(message, ...optionalParams);
  }

  /**
   * Protokolliert eine Nachricht auf dem 'debug'-Level.
   *
   * @param {any} message - Die zu protokollierende Debug-Nachricht
   * @param {any[]} optionalParams - Zusätzliche zu protokollierende Parameter
   */
  debug(message: any, ...optionalParams: any[]) {
    logger.debug(message, ...optionalParams);
  }

  /**
   * Protokolliert eine Nachricht auf dem 'verbose'-Level (wird auf Consola 'trace' abgebildet).
   *
   * @param {any} message - Die zu protokollierende Verbose-Nachricht
   * @param {any[]} optionalParams - Zusätzliche zu protokollierende Parameter
   */
  verbose(message: any, ...optionalParams: any[]) {
    logger.trace(message, ...optionalParams);
  }

  /**
   * Setzt die zu verwendenden Log-Levels (NestJS-Anforderung).
   * Nicht implementiert, da Consola ein anderes Level-System verwendet.
   *
   * @param {LogLevel[]} _levels - Zu setzende Log-Levels
   */
  setLogLevels(_levels: LogLevel[]) {
    // Consola verwendet ein anderes Level-System, daher ignorieren wir dies
  }
}
