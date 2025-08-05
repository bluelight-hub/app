import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für die Admin-Login-Response
 */
export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'Admin-Benutzerinformationen',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'admin',
      role: 'ADMIN',
    },
  })
  user: {
    id: string;
    username: string;
    role: string;
  };
}
