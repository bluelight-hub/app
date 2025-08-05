import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

/**
 * DTO für die Admin-Setup-Response
 */
export class AdminSetupResponseDto {
  @ApiProperty({
    description: 'Erfolgsmeldung',
    example: 'Admin-Setup erfolgreich durchgeführt',
  })
  message: string;

  @ApiProperty({
    description: 'Admin-Benutzerinformationen',
  })
  user: Partial<User>;

  @ApiProperty({
    description: 'Admin-Token für weitere Operationen',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;
}
