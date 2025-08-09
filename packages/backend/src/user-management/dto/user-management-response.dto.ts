import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '@/common/interfaces/api-response.interface';
import { UserRole } from '@prisma/client';

/**
 * DTO für einen einzelnen Benutzer
 */
export class UserDto {
  @ApiProperty({
    description: 'Eindeutige ID des Benutzers',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'Benutzername', example: 'max.mustermann' })
  username: string;

  @ApiProperty({
    description: 'Rolle des Benutzers',
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    example: 'USER',
  })
  role: UserRole;

  @ApiProperty({ description: 'Erstellungsdatum', example: '2024-01-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Datum der letzten Aktualisierung',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Response-DTO für die Benutzerliste
 */
export class UsersListResponse extends ApiResponse<UserDto[]> {
  @ApiProperty({
    description: 'Liste der Benutzer',
    type: UserDto,
    isArray: true,
  })
  data: UserDto[];
}

/**
 * Response-DTO für einen einzelnen Benutzer
 */
export class UserResponse extends ApiResponse<UserDto> {
  @ApiProperty({
    description: 'Benutzerdaten',
    type: UserDto,
  })
  data: UserDto;
}

/**
 * Response-DTO für Lösch-Operationen
 */
export class DeleteUserResponse extends ApiResponse<{ id: string; deleted: boolean }> {
  @ApiProperty({
    description: 'Lösch-Bestätigung',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID des gelöschten Benutzers' },
      deleted: { type: 'boolean', description: 'Bestätigung der Löschung' },
    },
  })
  data: { id: string; deleted: boolean };
}
