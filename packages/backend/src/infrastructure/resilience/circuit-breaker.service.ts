/**
 * Circuit Breaker Service - Infrastructure Layer.
 *
 * Verwaltet Circuit Breaker Instanzen fuer externe Integrationen.
 * Jeder Service bekommt einen eigenen Circuit Breaker mit konfiguriertem
 * Failure-Threshold, Rolling Window und Open-Duration.
 *
 * **KEIN Domain-Konzept** - rein technischer Resilienz-Mechanismus.
 *
 * @see Story 5.3 AC1
 * @module infrastructure/resilience
 */
import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { Result } from '@domain/common/result';
import { CircuitBreakerState, CircuitBreakerStateEnum, DEFAULT_CIRCUIT_BREAKER_CONFIG, type CircuitBreakerConfig } from '@infrastructure/resilience/circuit-breaker-state';

/**
 * Status-Information eines einzelnen Circuit Breakers.
 * Verwendet fuer Health-Endpoint (AC4) und WebSocket Events (AC6).
 */
export interface CircuitStatus {
  serviceName: string;
  state: CircuitBreakerStateEnum;
  failureCount: number;
  successCount: number;
  lastFailure: string | null;
  lastSuccess: string | null;
}

/**
 * Listener fuer Circuit Breaker State Changes.
 * Wird fuer WebSocket Broadcasting verwendet.
 */
export type CircuitStateChangeListener = (serviceName: string, newState: CircuitBreakerStateEnum) => void;

@Injectable()
export class CircuitBreakerService {
  private readonly circuits: Map<string, CircuitBreakerState> = new Map();
  private readonly configs: Map<string, CircuitBreakerConfig> = new Map();
  private readonly stateChangeListeners: CircuitStateChangeListener[] = [];
  private readonly executeLocks: Map<string, Promise<Result<unknown>>> = new Map();

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Registriert einen Circuit Breaker fuer einen Service.
   *
   * @param serviceName - Eindeutiger Service-Name (z.B. 'hiorg-server', 'etb')
   * @param config - Optionale Konfiguration (Default: 5 Failures / 60s / 30s Open)
   */
  register(serviceName: string, config?: Partial<CircuitBreakerConfig>): void {
    const fullConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.configs.set(serviceName, fullConfig);
    this.circuits.set(serviceName, new CircuitBreakerState(fullConfig));
    this.logger.log(`Circuit Breaker registriert: ${serviceName}`, 'CircuitBreakerService');
  }

  /**
   * Registriert einen Circuit Breaker nur wenn er noch nicht existiert.
   * Sicher fuer mehrfache Aufrufe (z.B. in Adapter-Constructors).
   */
  registerIfNotExists(serviceName: string, config?: Partial<CircuitBreakerConfig>): void {
    if (this.circuits.has(serviceName)) return;
    this.register(serviceName, config);
  }

  /**
   * Fuehrt eine Operation mit Circuit Breaker Protection aus.
   *
   * @param serviceName - Name des geschuetzten Services
   * @param operation - Die auszufuehrende Operation
   * @param fallback - Optionale Fallback-Operation bei OPEN Circuit
   * @returns Result<T> mit Ergebnis oder Fehler
   */
  async execute<T>(serviceName: string, operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<Result<T>> {
    // H7: Per-Service Lock verhindert Race Conditions bei parallelen Calls
    const pending = this.executeLocks.get(serviceName);
    if (pending) {
      await pending.catch(() => {}); // Vorherigen Call abwarten, Fehler ignorieren
    }

    const promise = this.executeInternal(serviceName, operation, fallback);
    this.executeLocks.set(serviceName, promise as Promise<Result<unknown>>);
    try {
      return await promise;
    } finally {
      if (this.executeLocks.get(serviceName) === (promise as Promise<Result<unknown>>)) {
        this.executeLocks.delete(serviceName);
      }
    }
  }

  /** Interne Execute-Logik (nach Lock-Akquise) */
  private async executeInternal<T>(serviceName: string, operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<Result<T>> {
    const circuit = this.getOrCreate(serviceName);
    const previousState = circuit.currentState;

    // OPEN: Pruefe ob Half-Open moeglich
    if (circuit.isOpen()) {
      if (circuit.shouldAttemptHalfOpen()) {
        circuit.transitionToHalfOpen();
        this.notifyStateChange(serviceName, previousState, CircuitBreakerStateEnum.HALF_OPEN);
        return this.tryHalfOpen(serviceName, circuit, operation, fallback);
      }

      this.logger.warn(`Circuit OPEN fuer ${serviceName} - verwende Fallback`, 'CircuitBreakerService');

      if (fallback) {
        try {
          return Result.ok(await fallback());
        } catch (error) {
          return Result.fail(`Fallback fuer ${serviceName} fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannt'}`);
        }
      }
      return Result.fail(`Circuit open fuer ${serviceName}`);
    }

    // CLOSED oder HALF_OPEN: Fuehre Operation aus
    try {
      const result = await operation();
      const prevState = circuit.currentState;
      circuit.recordSuccess();

      if (prevState !== circuit.currentState) {
        this.notifyStateChange(serviceName, prevState, circuit.currentState);
      }

      return Result.ok(result);
    } catch (error) {
      const prevState = circuit.currentState;
      circuit.recordFailure();

      if (prevState !== circuit.currentState) {
        this.notifyStateChange(serviceName, prevState, circuit.currentState);
      }

      this.logger.warn(
        `Circuit Breaker ${serviceName}: Failure ${circuit.failureCount}/${this.getConfig(serviceName).failureThreshold} - ${error instanceof Error ? error.message : 'Unbekannt'}`,
        'CircuitBreakerService',
      );

      if (fallback) {
        try {
          return Result.ok(await fallback());
        } catch (_fallbackError) {
          return Result.fail(`${serviceName}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
        }
      }
      return Result.fail(`${serviceName}: ${error instanceof Error ? error.message : 'Unbekannt'}`);
    }
  }

  /**
   * Gibt den Status eines Circuit Breakers zurueck.
   */
  getState(serviceName: string): CircuitBreakerStateEnum {
    const circuit = this.circuits.get(serviceName);
    return circuit?.currentState ?? CircuitBreakerStateEnum.CLOSED;
  }

  /**
   * Gibt den Status aller registrierten Circuit Breakers zurueck.
   * Verwendet fuer den Health-Endpoint (AC4).
   */
  getAllStatus(): CircuitStatus[] {
    return Array.from(this.circuits.entries()).map(([name, circuit]) => ({
      serviceName: name,
      state: circuit.currentState,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      lastFailure: circuit.lastFailure?.toISOString() ?? null,
      lastSuccess: circuit.lastSuccess?.toISOString() ?? null,
    }));
  }

  /**
   * Setzt einen Circuit Breaker manuell zurueck.
   */
  reset(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (circuit) {
      const prevState = circuit.currentState;
      circuit.reset();
      if (prevState !== CircuitBreakerStateEnum.CLOSED) {
        this.notifyStateChange(serviceName, prevState, CircuitBreakerStateEnum.CLOSED);
      }
      this.logger.log(`Circuit Breaker reset: ${serviceName}`, 'CircuitBreakerService');
    }
  }

  /**
   * Registriert einen Listener fuer State Changes (fuer WebSocket Broadcasting).
   * Unterstuetzt mehrere Listener (push statt ueberschreiben).
   */
  onStateChange(listener: CircuitStateChangeListener): void {
    this.stateChangeListeners.push(listener);
  }

  /**
   * Prueft ob ein Circuit OPEN ist (Convenience-Methode).
   */
  isOpen(serviceName: string): boolean {
    const circuit = this.circuits.get(serviceName);
    return circuit?.isOpen() ?? false;
  }

  /** Holt oder erstellt einen Circuit Breaker (warnt bei Auto-Registrierung) */
  private getOrCreate(serviceName: string): CircuitBreakerState {
    let circuit = this.circuits.get(serviceName);
    if (!circuit) {
      this.logger.warn(`Circuit Breaker fuer '${serviceName}' war nicht registriert - Auto-Registrierung mit Defaults. Bitte registerIfNotExists() im Constructor verwenden.`, 'CircuitBreakerService');
      this.register(serviceName);
      circuit = this.circuits.get(serviceName)!;
    }
    return circuit;
  }

  /** Holt die Config fuer einen Service */
  private getConfig(serviceName: string): CircuitBreakerConfig {
    return this.configs.get(serviceName) ?? DEFAULT_CIRCUIT_BREAKER_CONFIG;
  }

  /** Versucht einen Half-Open Test-Call */
  private async tryHalfOpen<T>(serviceName: string, circuit: CircuitBreakerState, operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<Result<T>> {
    if (!circuit.canAttemptHalfOpenRequest()) {
      if (fallback) {
        try {
          return Result.ok(await fallback());
        } catch {
          return Result.fail(`Half-Open: Max Requests erreicht fuer ${serviceName}`);
        }
      }
      return Result.fail(`Half-Open: Max Requests erreicht fuer ${serviceName}`);
    }

    circuit.incrementHalfOpenRequests();

    try {
      const result = await operation();
      const prevState = circuit.currentState;
      circuit.recordSuccess();

      if (prevState !== circuit.currentState) {
        this.notifyStateChange(serviceName, prevState, circuit.currentState);
      }

      this.logger.log(`Circuit Breaker ${serviceName}: Half-Open Test erfolgreich → CLOSED`, 'CircuitBreakerService');

      return Result.ok(result);
    } catch (_error) {
      const prevState = circuit.currentState;
      circuit.recordFailure();

      if (prevState !== circuit.currentState) {
        this.notifyStateChange(serviceName, prevState, circuit.currentState);
      }

      this.logger.warn(`Circuit Breaker ${serviceName}: Half-Open Test fehlgeschlagen → OPEN`, 'CircuitBreakerService');

      if (fallback) {
        try {
          return Result.ok(await fallback());
        } catch {
          return Result.fail(`${serviceName}: Half-Open Test fehlgeschlagen`);
        }
      }
      return Result.fail(`${serviceName}: Half-Open Test fehlgeschlagen`);
    }
  }

  /** Benachrichtigt alle Listener ueber State-Aenderungen */
  private notifyStateChange(serviceName: string, previousState: CircuitBreakerStateEnum, newState: CircuitBreakerStateEnum): void {
    this.logger.log(`Circuit Breaker ${serviceName}: ${previousState} → ${newState}`, 'CircuitBreakerService');

    for (const listener of this.stateChangeListeners) {
      try {
        listener(serviceName, newState);
      } catch (error) {
        this.logger.error(`State Change Listener Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}`, 'CircuitBreakerService');
      }
    }
  }
}
