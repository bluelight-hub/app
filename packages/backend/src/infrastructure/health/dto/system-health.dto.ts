import { ApiProperty } from '@nestjs/swagger';

/**
 * API Response Time Percentile-Werte.
 */
class ApiResponseTimeDto {
  @ApiProperty({ example: 15, description: 'p50 Response Time in ms' })
  p50!: number;

  @ApiProperty({ example: 85, description: 'p95 Response Time in ms' })
  p95!: number;

  @ApiProperty({ example: 250, description: 'p99 Response Time in ms' })
  p99!: number;
}

/**
 * Circuit Breaker Status pro Integration.
 */
class CircuitBreakerStatusEntryDto {
  @ApiProperty({ example: 'hiorg-server', description: 'Service-Name' })
  serviceName!: string;

  @ApiProperty({ example: 'CLOSED', enum: ['CLOSED', 'OPEN', 'HALF_OPEN'] })
  state!: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

/**
 * System-Health-Response DTO.
 *
 * Aggregierter Systemzustand fuer das Monitoring-Dashboard.
 *
 * @see Story 5.6 AC2
 */
export class SystemHealthDto {
  @ApiProperty({
    example: 99.5,
    description: 'Prozent erfolgreich zugestellter Befehle im 5min-Window (Ziel: >99%)',
  })
  zustellrate!: number;

  @ApiProperty({
    example: 42,
    description: 'Anzahl aktiver WebSocket-Verbindungen',
  })
  websocketConnections!: number;

  @ApiProperty({
    example: 3,
    description: 'Anzahl wartender Events im Outbox',
  })
  outboxQueueDepth!: number;

  @ApiProperty({
    type: ApiResponseTimeDto,
    description: 'API Response Times (p50, p95, p99) in ms',
  })
  apiResponseTime!: ApiResponseTimeDto;

  @ApiProperty({
    type: [CircuitBreakerStatusEntryDto],
    description: 'Status pro Integration (CLOSED/OPEN/HALF_OPEN)',
  })
  circuitBreakerStatus!: CircuitBreakerStatusEntryDto[];

  @ApiProperty({
    example: 45,
    description: 'DB-Connection-Pool-Auslastung in Prozent',
  })
  dbConnectionPoolUsage!: number;

  @ApiProperty({
    example: 86400,
    description: 'Server-Uptime in Sekunden',
  })
  uptime!: number;
}
