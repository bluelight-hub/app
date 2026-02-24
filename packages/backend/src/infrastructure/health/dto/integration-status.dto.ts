import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Status eines einzelnen Circuit Breakers.
 *
 * @see Story 5.3 AC4
 */
export class IntegrationStatusDto {
  @ApiProperty({
    example: 'hiorg-server',
    description: 'Name des externen Services',
  })
  serviceName!: string;

  /** Values aus CircuitBreakerStateEnum (infrastructure/resilience/circuit-breaker-state.ts) */
  @ApiProperty({
    example: 'CLOSED',
    enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
    description: 'Aktueller Circuit Breaker Zustand',
  })
  state!: 'CLOSED' | 'OPEN' | 'HALF_OPEN';

  @ApiProperty({
    example: 0,
    description: 'Anzahl der Failures im aktuellen Fenster',
  })
  failureCount!: number;

  @ApiPropertyOptional({
    example: '2026-02-23T10:30:00.000Z',
    description: 'Zeitpunkt des letzten Failures (null wenn kein Failure)',
  })
  lastFailure!: string | null;

  @ApiPropertyOptional({
    example: '2026-02-23T10:29:00.000Z',
    description: 'Zeitpunkt des letzten erfolgreichen Calls (null wenn noch kein Erfolg)',
  })
  lastSuccess!: string | null;

  /** p95 Response Time der letzten 5 Minuten in ms (Story 5.6 AC5) */
  @ApiPropertyOptional({
    example: 120,
    description: 'p95 Response Time in ms (letzte 5 Minuten)',
  })
  responseTimeP95?: number;

  /** Fehlerrate der letzten 5 Minuten in Prozent (Story 5.6 AC5) */
  @ApiPropertyOptional({
    example: 2.5,
    description: 'Fehlerrate in % (letzte 5 Minuten)',
  })
  errorRate?: number;

  /** Zeitpunkt des letzten erfolgreichen Calls (Story 5.6 AC5) */
  @ApiPropertyOptional({
    example: '2026-02-23T10:29:00.000Z',
    description: 'Zeitpunkt des letzten erfolgreichen Calls (ISO 8601)',
  })
  lastSuccessAt?: string | null;

  /** Zeitpunkt des letzten fehlgeschlagenen Calls (Story 5.6 AC5) */
  @ApiPropertyOptional({
    example: '2026-02-23T10:25:00.000Z',
    description: 'Zeitpunkt des letzten fehlgeschlagenen Calls (ISO 8601)',
  })
  lastFailureAt?: string | null;
}
