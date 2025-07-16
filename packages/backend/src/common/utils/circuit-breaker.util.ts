import { Logger } from '@nestjs/common';

/**
 * Konfiguration für Circuit Breaker
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
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureCountWindow: 60000, // 1 Minute
  openStateDuration: 30000, // 30 Sekunden
  successThreshold: 3,
  failureRateThreshold: 50,
  minimumNumberOfCalls: 5,
};

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit Breaker Implementierung zur Vermeidung von Kaskadierenden Fehlern
 *
 * Der Circuit Breaker schützt vor wiederholten Aufrufen fehlerhafter Services:
 * - CLOSED: Normale Operation, Aufrufe werden durchgelassen
 * - OPEN: Zu viele Fehler, Aufrufe werden blockiert
 * - HALF_OPEN: Testphase, ob der Service wieder verfügbar ist
 */
export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private openedAt: number | null = null;
  private readonly config: CircuitBreakerConfig;
  private readonly callHistory: { timestamp: number; success: boolean }[] = [];

  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {},
  ) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Führt eine Operation mit Circuit Breaker Schutz aus
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
   */
  private openCircuit(now: number): void {
    this.state = CircuitState.OPEN;
    this.openedAt = now;
    this.failureCount = 0;
  }

  /**
   * Berechnet die aktuelle Fehlerrate
   */
  private calculateFailureRate(): number {
    if (this.callHistory.length === 0) return 0;

    const failures = this.callHistory.filter((call) => !call.success).length;
    return (failures / this.callHistory.length) * 100;
  }

  /**
   * Entfernt alte Einträge aus der Historie
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
