/**
 * RefreshTokenResponseDto - Response DTO für manuelles Token-Refresh.
 *
 * @module modules/integrations/dto
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für Token-Refresh.
 */
export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'Wurde das Token erneuert?',
    example: true,
  })
  refreshed!: boolean;

  @ApiProperty({
    description: 'Neuer Ablaufzeitpunkt des Access Tokens',
    example: '2025-01-15T12:00:00.000Z',
  })
  accessTokenExpiresAt!: Date;

  @ApiProperty({
    description: 'Ist ein Refresh Token vorhanden?',
    example: true,
  })
  hasRefreshToken!: boolean;
}
