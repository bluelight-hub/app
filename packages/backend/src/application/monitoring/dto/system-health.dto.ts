/**
 * DTO fuer den System-Health-Status.
 *
 * Enthaelt alle aggregierten Metriken fuer das Monitoring-Dashboard.
 *
 * @remarks Story 5.6 AC2
 */
export interface SystemHealthDto {
  /** Erfolgsquote der Befehl-Zustellung (0-100%) */
  zustellrate: number;
  /** Anzahl aktiver WebSocket-Verbindungen */
  websocketConnections: number;
  /** Anzahl Events in der Outbox-Queue */
  outboxQueueDepth: number;
  /** API Antwortzeiten in Millisekunden */
  apiResponseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  /** Status je Circuit Breaker */
  circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
  /** DB-Connection-Pool-Auslastung (0-100%) */
  dbConnectionPoolUsage: number;
  /** Server-Laufzeit in Sekunden */
  uptime: number;
  /** Zeitpunkt der Momentaufnahme */
  timestamp: Date;
}
