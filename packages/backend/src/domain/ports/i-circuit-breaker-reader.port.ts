/**
 * Circuit Breaker Reader Port - Domain Layer.
 *
 * Read-only Abstraktion fuer Circuit Breaker Status-Abfragen.
 * Ermoeglicht Application Layer Zugriff auf CB-Status ohne
 * direkte Infrastructure-Abhaengigkeit.
 *
 * @see Story 5.3
 * @module domain/ports
 */

/**
 * Moegliche Circuit Breaker Zustaende.
 *
 * Definiert im Domain Layer, da Application Layer
 * diese Zustaende fuer Status-Mapping benoetigt.
 */
export enum CircuitBreakerStateEnum {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Status-Information eines einzelnen Circuit Breakers.
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
 * Read-only Port fuer Circuit Breaker Status-Abfragen.
 *
 * Wird von Application Layer Queries verwendet, um
 * CB-Status ohne Infrastructure-Import abzufragen.
 */
export interface ICircuitBreakerReader {
  /** Gibt den Status aller registrierten Circuit Breakers zurueck. */
  getAllStatus(): CircuitStatus[];

  /** Gibt den Zustand eines einzelnen Circuit Breakers zurueck. */
  getState(serviceName: string): CircuitBreakerStateEnum;

  /** Prueft ob ein Circuit OPEN ist. */
  isOpen(serviceName: string): boolean;
}
