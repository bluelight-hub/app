import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für die Token-Refresh-Response
 */
export class RefreshResponseDto {
  @ApiProperty({
    description: 'Neues Access-Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
}
