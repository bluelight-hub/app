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
}
