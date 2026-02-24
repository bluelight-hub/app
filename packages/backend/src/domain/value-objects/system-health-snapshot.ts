import { ValueObject } from '@domain/common/value-object';
import { Result } from '@domain/common/result';

/**
 * API Response Time Percentile-Werte.
 */
interface ApiResponseTime {
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Props fuer SystemHealthSnapshot Value Object.
 */
interface SystemHealthSnapshotProps extends Record<string, unknown> {
  zustellrate: number;
  websocketConnections: number;
  outboxQueueDepth: number;
  apiResponseTime: ApiResponseTime;
  circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
  dbConnectionPoolUsage: number;
  uptime: number;
  timestamp: Date;
}

/**
 * SystemHealthSnapshot Value Object — Momentaufnahme des System-Gesundheitszustands.
 *
 * Modelliert alle relevanten Metriken fuer das System-Monitoring:
 * - zustellrate: Erfolgsquote der Befehl-Zustellung (0-100%)
 * - websocketConnections: Anzahl aktiver WebSocket-Verbindungen
 * - outboxQueueDepth: Anzahl Events in der Outbox-Queue
 * - apiResponseTime: Antwortzeiten (p50, p95, p99) in Millisekunden
 * - circuitBreakerStatus: Status je Circuit Breaker
 * - dbConnectionPoolUsage: DB-Connection-Pool-Auslastung (0-100%)
 * - uptime: Server-Laufzeit in Sekunden
 * - timestamp: Zeitpunkt der Momentaufnahme
 *
 * @remarks Story 5.6 AC3
 */
export class SystemHealthSnapshot extends ValueObject<SystemHealthSnapshotProps> {
  get zustellrate(): number {
    return this.props.zustellrate;
  }

  get websocketConnections(): number {
    return this.props.websocketConnections;
  }

  get outboxQueueDepth(): number {
    return this.props.outboxQueueDepth;
  }

  get apiResponseTime(): ApiResponseTime {
    return this.props.apiResponseTime as ApiResponseTime;
  }

  get circuitBreakerStatus(): Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'> {
    return this.props.circuitBreakerStatus as Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
  }

  get dbConnectionPoolUsage(): number {
    return this.props.dbConnectionPoolUsage;
  }

  get uptime(): number {
    return this.props.uptime;
  }

  get timestamp(): Date {
    return this.props.timestamp as Date;
  }

  private constructor(props: SystemHealthSnapshotProps) {
    super(props);
  }

  /**
   * Factory Method mit Validierung.
   */
  static create(props: {
    zustellrate: number;
    websocketConnections: number;
    outboxQueueDepth: number;
    apiResponseTime: ApiResponseTime;
    circuitBreakerStatus: Record<string, 'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
    dbConnectionPoolUsage: number;
    uptime: number;
    timestamp: Date;
  }): Result<SystemHealthSnapshot> {
    if (props.zustellrate < 0 || props.zustellrate > 100) {
      return Result.fail<SystemHealthSnapshot>('Zustellrate muss zwischen 0 und 100 liegen');
    }

    if (props.websocketConnections < 0 || !Number.isInteger(props.websocketConnections)) {
      return Result.fail<SystemHealthSnapshot>('WebSocket-Connections muss eine nicht-negative ganze Zahl sein');
    }

    if (props.outboxQueueDepth < 0 || !Number.isInteger(props.outboxQueueDepth)) {
      return Result.fail<SystemHealthSnapshot>('Outbox-Queue-Depth muss eine nicht-negative ganze Zahl sein');
    }

    if (props.apiResponseTime.p50 < 0 || props.apiResponseTime.p95 < 0 || props.apiResponseTime.p99 < 0) {
      return Result.fail<SystemHealthSnapshot>('API Response Times muessen nicht-negativ sein');
    }

    if (props.dbConnectionPoolUsage < 0 || props.dbConnectionPoolUsage > 100) {
      return Result.fail<SystemHealthSnapshot>('DB-Connection-Pool-Usage muss zwischen 0 und 100 liegen');
    }

    if (props.uptime < 0) {
      return Result.fail<SystemHealthSnapshot>('Uptime muss nicht-negativ sein');
    }

    return Result.ok<SystemHealthSnapshot>(new SystemHealthSnapshot(props));
  }

  public toString(): string {
    return `Health[zustellrate=${this.zustellrate}%, ws=${this.websocketConnections}, outbox=${this.outboxQueueDepth}, db=${this.dbConnectionPoolUsage}%, uptime=${this.uptime}s]`;
  }
}
