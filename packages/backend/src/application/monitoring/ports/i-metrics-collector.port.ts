/**
 * Port fuer Metriken-Sammlung.
 *
 * Abstrahiert den Zugriff auf Prometheus-Metriken und System-Status
 * damit der Application Layer framework-agnostisch bleibt.
 *
 * @remarks Story 5.6 AC2
 */
export interface IMetricsCollector {
  /** Liest die aktuelle Zustellrate (0-100%) */
  getZustellrate(): Promise<number>;

  /** Liest die aktuelle Anzahl aktiver WebSocket-Verbindungen */
  getWebsocketConnections(): Promise<number>;

  /** Liest die aktuelle Outbox Queue Depth */
  getOutboxQueueDepth(): Promise<number>;

  /** Liest die API Antwortzeiten (p50, p95, p99) in Millisekunden */
  getApiResponseTime(): Promise<{ p50: number; p95: number; p99: number }>;

  /** Liest die DB-Connection-Pool-Auslastung (0-100%) */
  getDbConnectionPoolUsage(): Promise<number>;

  /** Liest die Server-Uptime in Sekunden */
  getUptime(): Promise<number>;

  /** Liest den Circuit Breaker Status aller Integrationen */
  getCircuitBreakerStatus(): CircuitBreakerStatusInfo[];
}

/** Circuit Breaker Status pro Integration (framework-agnostisch) */
export interface CircuitBreakerStatusInfo {
  serviceName: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
