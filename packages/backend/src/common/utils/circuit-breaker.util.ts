import { Logger } from '@nestjs/common';

/**
 * Konfiguration für Circuit Breaker
 *
 * Definiert alle Parameter zur Steuerung des Circuit Breaker Verhaltens.
 * Diese Konfiguration bestimmt, wann der Circuit öffnet, wie lange er offen
 * bleibt und unter welchen Bedingungen er wieder schließt.
 *
 * @interface CircuitBreakerConfig
 *
 * @example
 * ```typescript
 * const config: CircuitBreakerConfig = {
 *   failureThreshold: 5,        // Öffnet nach 5 Fehlern
 *   failureCountWindow: 60000,  // Innerhalb von 1 Minute
 *   openStateDuration: 30000,   // Bleibt 30 Sekunden offen
 *   successThreshold: 3,        // 3 erfolgreiche Aufrufe zum Schließen
 *   failureRateThreshold: 50,   // Oder bei 50% Fehlerrate
 *   minimumNumberOfCalls: 5     // Mindestens 5 Aufrufe für Statistik
 * };
 * ```
 */
export interface CircuitBreakerConfig {
  /** Anzahl der Fehler, bevor der Circuit öffnet */
  failureThreshold: number;
  /** Zeitfenster in Millisekunden, in dem Fehler gezählt werden */
  failureCountWindow: number;
  /** Zeit in Millisekunden, die der Circuit offen bleibt */
  openStateDuration: number;
  /** Anzahl der erfolgreichen Aufrufe im Half-Open-Zustand, bevor der Circuit schließt */
  successThreshold: number;
  /** Prozentsatz der Fehler, ab dem der Circuit öffnet (0-100) */
  failureRateThreshold: number;
  /** Minimale Anzahl von Aufrufen, bevor der Circuit Breaker aktiv wird */
  minimumNumberOfCalls: number;
}

/**
 * Standard-Konfiguration für Circuit Breaker
 *
 * Diese Konfiguration bietet ausgewogene Standardwerte für die meisten
 * Anwendungsfälle. Die Werte können bei der Erstellung eines Circuit
 * Breakers überschrieben werden.
 *
 * @constant
 * @type {CircuitBreakerConfig}
 *
 * @example
 * ```typescript
 * // Verwendung der Standardkonfiguration
 * const breaker = new CircuitBreaker('api-service');
 *
 * // Überschreiben einzelner Werte
 * const customBreaker = new CircuitBreaker('critical-service', {
 *   failureThreshold: 3,      // Strengere Fehlertoleranz
 *   openStateDuration: 60000  // Längere Wartezeit
 * });
 * ```
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureCountWindow: 60000, // 1 Minute
  openStateDuration: 30000, // 30 Sekunden
  successThreshold: 3,
  failureRateThreshold: 50,
  minimumNumberOfCalls: 5,
};

/**
 * Mögliche Zustände eines Circuit Breakers
 *
 * @enum {string}
 *
 * @property {string} CLOSED - Normalbetrieb, alle Aufrufe werden durchgelassen
 * @property {string} OPEN - Circuit ist offen, Aufrufe werden blockiert
 * @property {string} HALF_OPEN - Testphase, begrenzte Aufrufe werden durchgelassen
 *
 * @example
 * ```typescript
 * switch (breaker.getStatus().state) {
 *   case CircuitState.CLOSED:
 *     logger.info('Service ist verfügbar');
 *     break;
 *   case CircuitState.OPEN:
 *     logger.warn('Service ist nicht erreichbar');
 *     break;
 *   case CircuitState.HALF_OPEN:
 *     logger.info('Service wird getestet');
 *     break;
 * }
 * ```
 */
export enum CircuitState {
  /** Normalbetrieb - Aufrufe werden durchgelassen */
  CLOSED = 'CLOSED',
  /** Fehlerzustand - Aufrufe werden blockiert */
  OPEN = 'OPEN',
  /** Testphase - Limitierte Aufrufe zur Prüfung */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit Breaker Implementierung zur Vermeidung von kaskadierenden Fehlern
 *
 * Der Circuit Breaker schützt vor wiederholten Aufrufen fehlerhafter Services
 * und verhindert, dass Fehler sich durch das System ausbreiten. Er arbeitet
 * nach dem Prinzip eines elektrischen Schutzschalters:
 *
 * - CLOSED: Normale Operation, Aufrufe werden durchgelassen
 * - OPEN: Zu viele Fehler, Aufrufe werden blockiert
 * - HALF_OPEN: Testphase, ob der Service wieder verfügbar ist
 *
 * @class CircuitBreaker
 *
 * @example
 * ```typescript
 * // Circuit Breaker erstellen
 * const apiBreaker = new CircuitBreaker('external-api', {
 *   failureThreshold: 5,
 *   openStateDuration: 30000
 * });
 *
 * // Verwendung mit geschütztem Aufruf
 * try {
 *   const result = await apiBreaker.execute(async () => {
 *     return await externalApiCall();
 *   });
 * } catch (error) {
 *   if (error.name === 'CircuitBreakerOpenError') {
 *     // Circuit ist offen, Service nicht verfügbar
 *     return cachedData;
 *   }
 *   throw error;
 * }
 *
 * // Status abfragen
 * const status = apiBreaker.getStatus();
 * logger.info(`Circuit State: ${status.state}`);
 * logger.info(`Failure Rate: ${status.failureRate}%`);
 * ```
 */
export class CircuitBreaker {
  /**
   * Logger-Instanz für Circuit Breaker Ereignisse
   * @private
   * @property {Logger} logger
   */
  private readonly logger = new Logger(CircuitBreaker.name);

  /**
   * Aktueller Zustand des Circuit Breakers
   * @private
   * @property {CircuitState} state
   */
  private state: CircuitState = CircuitState.CLOSED;

  /**
   * Anzahl der Fehler im aktuellen Zeitfenster
   * @private
   * @property {number} failureCount
   */
  private failureCount = 0;

  /**
   * Anzahl erfolgreicher Aufrufe im HALF_OPEN Zustand
   * @private
   * @property {number} successCount
   */
  private successCount = 0;

  /**
   * Zeitstempel des letzten Fehlers
   * @private
   * @property {number | null} lastFailureTime
   */
  private lastFailureTime: number | null = null;

  /**
   * Zeitstempel wann der Circuit geöffnet wurde
   * @private
   * @property {number | null} openedAt
   */
  private openedAt: number | null = null;

  /**
   * Konfiguration des Circuit Breakers
   * @private
   * @property {CircuitBreakerConfig} config
   */
  private readonly config: CircuitBreakerConfig;

  /**
   * Historie der Aufrufe für Statistiken
   * @private
   * @property {Array<{timestamp: number, success: boolean}>} callHistory
   */
  private readonly callHistory: { timestamp: number; success: boolean }[] = [];

  /**
   * Konstruktor des Circuit Breakers
   *
   * @param {string} name - Eindeutiger Name zur Identifikation des Circuit Breakers
   * @param {Partial<CircuitBreakerConfig>} [config={}] - Optionale Konfiguration (überschreibt Standardwerte)
   *
   * @example
   * ```typescript
   * // Mit Standardkonfiguration
   * const breaker = new CircuitBreaker('payment-service');
   *
   * // Mit angepasster Konfiguration
   * const criticalBreaker = new CircuitBreaker('auth-service', {
   *   failureThreshold: 3,
   *   failureRateThreshold: 30,
   *   openStateDuration: 60000
   * });
   * ```
   */
  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Führt eine Operation mit Circuit Breaker Schutz aus
   *
   * Die Operation wird nur ausgeführt, wenn der Circuit nicht offen ist.
   * Bei Erfolg wird der Success-Counter erhöht, bei Fehler der Failure-Counter.
   * Der Circuit öffnet sich automatisch bei zu vielen Fehlern.
   *
   * @template T - Typ des Rückgabewerts der Operation
   * @param {() => Promise<T>} operation - Die auszuführende asynchrone Operation
   * @returns {Promise<T>} Das Ergebnis der Operation
   * @throws {Error} CircuitBreakerOpenError wenn der Circuit offen ist
   * @throws {Error} Den ursprünglichen Fehler der Operation bei Fehlschlag
   *
   * @example
   * ```typescript
   * // Einfache Verwendung
   * const data = await breaker.execute(async () => {
   *   return await fetchDataFromAPI();
   * });
   *
   * // Mit Fehlerbehandlung
   * try {
   *   const result = await breaker.execute(async () => {
   *     return await riskyOperation();
   *   });
   * } catch (error) {
   *   if (error.name === 'CircuitBreakerOpenError') {
   *     // Circuit ist offen, Fallback verwenden
   *     return getFromCache();
   *   }
   *   // Anderen Fehler weiterwerfen
   *   throw error;
   * }
   * ```
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
      error.name = 'CircuitBreakerOpenError';
      throw error;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Prüft, ob der Circuit offen ist
   *
   * Wenn der Circuit offen ist, wird geprüft ob die Wartezeit abgelaufen ist.
   * Falls ja, wird automatisch in den HALF_OPEN Zustand gewechselt.
   *
   * @private
   * @returns {boolean} true wenn der Circuit offen ist und blockiert
   *
   * @example
   * ```typescript
   * if (this.isOpen()) {
   *   throw new Error('Circuit is open');
   * }
   * // Circuit ist nicht offen, Operation kann durchgeführt werden
   * ```
   */
  private isOpen(): boolean {
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();
      const openDuration = now - (this.openedAt || 0);

      if (openDuration >= this.config.openStateDuration) {
        this.logger.log(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Verarbeitet einen erfolgreichen Aufruf
   *
   * Aktualisiert die Statistiken und den Zustand des Circuit Breakers
   * nach einem erfolgreichen Aufruf. Im HALF_OPEN Zustand wird geprüft,
   * ob genug erfolgreiche Aufrufe für ein Schließen des Circuits vorliegen.
   *
   * @private
   * @returns {void}
   */
  private onSuccess(): void {
    const now = Date.now();
    this.callHistory.push({ timestamp: now, success: true });
    this.cleanupOldHistory(now);

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.logger.log(`Circuit breaker ${this.name} transitioning to CLOSED`);
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Verarbeitet einen fehlgeschlagenen Aufruf
   *
   * Aktualisiert die Fehlerstatistiken und prüft, ob der Circuit
   * geöffnet werden muss. Im HALF_OPEN Zustand führt ein Fehler
   * sofort zum erneuten Öffnen des Circuits.
   *
   * @private
   * @returns {void}
   */
  private onFailure(): void {
    const now = Date.now();
    this.callHistory.push({ timestamp: now, success: false });
    this.cleanupOldHistory(now);

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn(`Circuit breaker ${this.name} failure in HALF_OPEN state, reopening`);
      this.openCircuit(now);
      return;
    }

    this.failureCount++;
    this.lastFailureTime = now;

    // Prüfe, ob genügend Aufrufe für eine Bewertung vorliegen
    if (this.callHistory.length >= this.config.minimumNumberOfCalls) {
      const failureRate = this.calculateFailureRate();

      if (
        this.failureCount >= this.config.failureThreshold ||
        failureRate >= this.config.failureRateThreshold
      ) {
        this.logger.error(
          `Circuit breaker ${this.name} opening: failures=${this.failureCount}, rate=${failureRate.toFixed(
            1,
          )}%`,
        );
        this.openCircuit(now);
      }
    }
  }

  /**
   * Öffnet den Circuit
   *
   * Versetzt den Circuit Breaker in den OPEN Zustand und setzt
   * die relevanten Zeitstempel und Zähler.
   *
   * @private
   * @param {number} now - Aktueller Zeitstempel in Millisekunden
   * @returns {void}
   */
  private openCircuit(now: number): void {
    this.state = CircuitState.OPEN;
    this.openedAt = now;
    this.failureCount = 0;
  }

  /**
   * Berechnet die aktuelle Fehlerrate
   *
   * Ermittelt den Prozentsatz fehlgeschlagener Aufrufe basierend
   * auf der Aufrufhistorie im konfigurierten Zeitfenster.
   *
   * @private
   * @returns {number} Fehlerrate in Prozent (0-100)
   *
   * @example
   * ```typescript
   * // Bei 3 Fehlern von 10 Aufrufen
   * const rate = this.calculateFailureRate(); // returns 30
   * ```
   */
  private calculateFailureRate(): number {
    if (this.callHistory.length === 0) return 0;

    const failures = this.callHistory.filter((call) => !call.success).length;
    return (failures / this.callHistory.length) * 100;
  }

  /**
   * Entfernt alte Einträge aus der Historie
   *
   * Bereinigt die Aufrufhistorie von Einträgen, die außerhalb des
   * konfigurierten Zeitfensters liegen. Dies hält die Statistiken
   * aktuell und den Speicherverbrauch niedrig.
   *
   * @private
   * @param {number} now - Aktueller Zeitstempel in Millisekunden
   * @returns {void}
   */
  private cleanupOldHistory(now: number): void {
    const cutoff = now - this.config.failureCountWindow;
    this.callHistory.splice(
      0,
      this.callHistory.findIndex((call) => call.timestamp > cutoff),
    );
  }

  /**
   * Gibt den aktuellen Status des Circuit Breakers zurück
   *
   * Liefert detaillierte Informationen über den Zustand und die
   * Statistiken des Circuit Breakers für Monitoring und Debugging.
   *
   * @public
   * @returns {Object} Status-Objekt mit folgenden Eigenschaften:
   * @returns {CircuitState} state - Aktueller Zustand (CLOSED, OPEN, HALF_OPEN)
   * @returns {number} failureCount - Anzahl der Fehler im aktuellen Zeitfenster
   * @returns {number} failureRate - Fehlerrate in Prozent
   * @returns {Date | null} lastFailureTime - Zeitpunkt des letzten Fehlers
   *
   * @example
   * ```typescript
   * const status = breaker.getStatus();
   * logger.info(`State: ${status.state}`);
   * logger.info(`Failures: ${status.failureCount}`);
   * logger.info(`Failure Rate: ${status.failureRate}%`);
   *
   * if (status.state === CircuitState.OPEN) {
   *   logger.warn('Service is currently unavailable');
   * }
   * ```
   */
  getStatus(): {
    state: CircuitState;
    failureCount: number;
    failureRate: number;
    lastFailureTime: Date | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureRate: this.calculateFailureRate(),
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
    };
  }

  /**
   * Setzt den Circuit Breaker zurück
   *
   * Setzt alle Zähler, Zeitstempel und den Zustand auf die Anfangswerte
   * zurück. Der Circuit wird in den CLOSED Zustand versetzt und die
   * Historie gelöscht. Nützlich für Tests oder manuelles Zurücksetzen
   * nach Wartungsarbeiten.
   *
   * @public
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Nach Behebung eines Problems
   * breaker.reset();
   * logger.info('Circuit Breaker wurde zurückgesetzt');
   *
   * // In Tests
   * afterEach(() => {
   *   breaker.reset();
   * });
   * ```
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.openedAt = null;
    this.callHistory.length = 0;
    this.logger.log(`Circuit breaker ${this.name} has been reset`);
  }
}
