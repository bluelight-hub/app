/**
 * Circuit Breaker State - Infrastructure Layer.
 *
 * Repraesentiert den aktuellen Zustand eines Circuit Breakers
 * als State Machine mit drei Zustaenden:
 *
 * - CLOSED: Normale Operation, Calls gehen durch
 * - OPEN: Nach Failure-Threshold → Keine Calls, sofortige Fallback-Response
 * - HALF_OPEN: Nach Timeout → Ein Test-Call, bei Erfolg → CLOSED, bei Failure → OPEN
 *
 * **KEIN Domain-Konzept** - rein technischer Resilienz-Mechanismus.
 *
 * @see Story 5.3 AC1
 * @module infrastructure/resilience
 */

/** Import aus Domain Port - Single Source of Truth fuer den Enum */
import { CircuitBreakerStateEnum } from '@domain/ports/i-circuit-breaker-reader.port';

/** Re-export fuer Rueckwaertskompatibilitaet innerhalb Infrastructure */
export { CircuitBreakerStateEnum };

/**
 * Konfiguration fuer einen Circuit Breaker.
 *
 * Defaults aus Epic-Spezifikation (Story 5.3 AC1):
 * - failureThreshold: 5 Failures
 * - windowMs: 60_000 (60 Sekunden Rolling Window)
 * - openDurationMs: 30_000 (30 Sekunden bis Half-Open)
 * - halfOpenMaxRequests: 1 (ein Test-Call)
 */
export interface CircuitBreakerConfig {
  /** Anzahl Failures bevor Circuit oeffnet */
  failureThreshold: number;
  /** Rolling Window fuer Failure-Counting in ms */
  windowMs: number;
  /** Dauer bis Half-Open in ms */
  openDurationMs: number;
  /** Maximale Test-Calls in Half-Open State */
  halfOpenMaxRequests: number;
}

/** Default-Konfiguration gemaess Story 5.3 AC1 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  windowMs: 60_000,
  openDurationMs: 30_000,
  halfOpenMaxRequests: 1,
};

/**
 * Circuit Breaker State Machine.
 *
 * Verwaltet den Zustand eines einzelnen Circuit Breakers inklusive
 * Failure-Tracking, Rolling Window und automatischem State Transition.
 */
export class CircuitBreakerState {
  private state: CircuitBreakerStateEnum = CircuitBreakerStateEnum.CLOSED;
  private failures: number[] = [];
  private successes: number[] = [];
  private openedAt: number | null = null;
  private halfOpenRequests = 0;
  private lastFailureAt: Date | null = null;
  private lastSuccessAt: Date | null = null;

  constructor(private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {}

  /** Aktueller Zustand */
  get currentState(): CircuitBreakerStateEnum {
    return this.state;
  }

  /** Anzahl Failures im aktuellen Rolling Window */
  get failureCount(): number {
    this.pruneExpiredFailures();
    return this.failures.length;
  }

  /** Anzahl erfolgreicher Calls im aktuellen Rolling Window */
  get successCount(): number {
    this.pruneExpiredSuccesses();
    return this.successes.length;
  }

  /** Zeitpunkt des letzten Failures */
  get lastFailure(): Date | null {
    return this.lastFailureAt;
  }

  /** Zeitpunkt des letzten Erfolgs */
  get lastSuccess(): Date | null {
    return this.lastSuccessAt;
  }

  /** Prueft ob Circuit OPEN ist */
  isOpen(): boolean {
    return this.state === CircuitBreakerStateEnum.OPEN;
  }

  /** Prueft ob Circuit CLOSED ist */
  isClosed(): boolean {
    return this.state === CircuitBreakerStateEnum.CLOSED;
  }

  /** Prueft ob Circuit HALF_OPEN ist */
  isHalfOpen(): boolean {
    return this.state === CircuitBreakerStateEnum.HALF_OPEN;
  }

  /**
   * Prueft ob ein Half-Open Test-Call versucht werden soll.
   * Nur moeglich wenn OPEN und openDurationMs abgelaufen.
   */
  shouldAttemptHalfOpen(): boolean {
    if (this.state !== CircuitBreakerStateEnum.OPEN || this.openedAt === null) {
      return false;
    }
    return Date.now() - this.openedAt >= this.config.openDurationMs;
  }

  /**
   * Wechselt in Half-Open State fuer einen Test-Call.
   * Nur aus OPEN State heraus moeglich.
   */
  transitionToHalfOpen(): void {
    if (this.state !== CircuitBreakerStateEnum.OPEN) return;
    this.state = CircuitBreakerStateEnum.HALF_OPEN;
    this.halfOpenRequests = 0;
  }

  /**
   * Registriert einen erfolgreichen Call.
   *
   * - In HALF_OPEN: Transition zu CLOSED (Recovery)
   * - In CLOSED: Keine State-Aenderung
   */
  recordSuccess(): void {
    this.lastSuccessAt = new Date();
    this.successes.push(Date.now());

    if (this.state === CircuitBreakerStateEnum.HALF_OPEN) {
      this.state = CircuitBreakerStateEnum.CLOSED;
      this.failures = [];
      this.openedAt = null;
      this.halfOpenRequests = 0;
    }
  }

  /**
   * Registriert einen fehlgeschlagenen Call.
   *
   * - In CLOSED: Failure zaehlen, bei Threshold → OPEN
   * - In HALF_OPEN: Sofort zurueck zu OPEN
   */
  recordFailure(): void {
    const now = Date.now();
    this.lastFailureAt = new Date();

    if (this.state === CircuitBreakerStateEnum.HALF_OPEN) {
      this.state = CircuitBreakerStateEnum.OPEN;
      this.openedAt = now;
      this.halfOpenRequests = 0;
      return;
    }

    if (this.state === CircuitBreakerStateEnum.CLOSED) {
      this.failures.push(now);
      this.pruneExpiredFailures();

      if (this.failures.length >= this.config.failureThreshold) {
        this.state = CircuitBreakerStateEnum.OPEN;
        this.openedAt = now;
      }
    }
  }

  /**
   * Prueft ob ein Half-Open Request erlaubt ist.
   * Maximal halfOpenMaxRequests Test-Calls gleichzeitig.
   */
  canAttemptHalfOpenRequest(): boolean {
    return this.state === CircuitBreakerStateEnum.HALF_OPEN && this.halfOpenRequests < this.config.halfOpenMaxRequests;
  }

  /** Inkrementiert Half-Open Request Counter */
  incrementHalfOpenRequests(): void {
    this.halfOpenRequests++;
  }

  /**
   * Setzt den Circuit Breaker zurueck auf CLOSED.
   * Fuer manuellen Reset/Admin-Eingriff.
   */
  reset(): void {
    this.state = CircuitBreakerStateEnum.CLOSED;
    this.failures = [];
    this.successes = [];
    this.openedAt = null;
    this.halfOpenRequests = 0;
    this.lastFailureAt = null;
    this.lastSuccessAt = null;
  }

  /** Entfernt Failures ausserhalb des Rolling Window */
  private pruneExpiredFailures(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.failures = this.failures.filter((ts) => ts > cutoff);
  }

  /** Entfernt Successes ausserhalb des Rolling Window */
  private pruneExpiredSuccesses(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.successes = this.successes.filter((ts) => ts > cutoff);
  }
}
