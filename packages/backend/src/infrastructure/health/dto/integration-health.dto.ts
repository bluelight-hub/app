import { ApiProperty } from '@nestjs/swagger';
import { IntegrationStatusDto } from './integration-status.dto';

/**
 * Health-Response fuer Integration-Status Endpoint.
 *
 * Zeigt den Circuit Breaker Status aller registrierten
 * externen Integrationen.
 *
 * @see Story 5.3 AC4
 */
export class IntegrationHealthDto {
  @ApiProperty({
    type: [IntegrationStatusDto],
    description: 'Status aller registrierten Circuit Breakers',
  })
  integrations!: IntegrationStatusDto[];
}
