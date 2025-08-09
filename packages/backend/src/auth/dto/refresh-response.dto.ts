import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für die Token-Refresh-Response
 */
export class RefreshResponseDto {
  @ApiProperty({
    description: 'Erfolgreich aktualisiert',
    example: true,
  })
  success: boolean;
}
