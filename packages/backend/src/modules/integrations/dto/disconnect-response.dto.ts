/**
 * DisconnectResponseDto - Response DTO für Integration-Trennung.
 *
 * @module modules/integrations/dto
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für Disconnect.
 */
export class DisconnectResponseDto {
  @ApiProperty({
    description: 'Wurde die Integration erfolgreich getrennt?',
    example: true,
  })
  disconnected!: boolean;

  @ApiProperty({
    description: 'Zeitpunkt der Trennung',
    example: '2025-01-15T12:00:00.000Z',
  })
  disconnectedAt!: Date;
}
