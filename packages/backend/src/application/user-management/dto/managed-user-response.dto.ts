import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UserRole } from '@/generated/prisma/client';
import { ApiResponse } from '@/shared/interfaces/api-response.interface';

/**
 * DTO für vollständige Benutzerinformationen (User Management Module)
 *
 * Wird für API-Responses verwendet (Infrastructure Layer).
 */
export class ManagedUserResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID des Benutzers',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ description: 'Benutzername', example: 'max.mustermann' })
  username!: string;

  @ApiProperty({
    description: 'Rolle des Benutzers',
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    example: 'USER',
  })
  role!: UserRole;

  @ApiProperty({ description: 'Erstellungsdatum', example: '2024-01-01T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    description: 'Datum der letzten Aktualisierung',
    example: '2024-01-01T12:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Gibt an, ob der Benutzer gesperrt ist',
    example: false,
  })
  isLocked!: boolean;

  @ApiProperty({
    description: 'Grund der Sperrung (optional)',
    type: String,
    example: 'Verstoß gegen Nutzungsbedingungen',
    required: false,
    nullable: true,
  })
  lockReason!: string | null;

  @ApiProperty({
    description: 'Operative Rolle des Benutzers',
    enum: ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'],
    example: 'EXTERNE',
  })
  operativeRole!: string;

  @ApiPropertyOptional({
    description: 'Zugewiesene Stammperson (falls vorhanden)',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Stammperson-ID' },
      vorname: { type: 'string', description: 'Vorname' },
      nachname: { type: 'string', description: 'Nachname' },
      personalnummer: { type: 'string', description: 'Personalnummer' },
    },
    nullable: true,
  })
  stammperson!: { id: string; vorname: string; nachname: string; personalnummer: string } | null;
}

/**
 * Response-DTO für die Benutzerliste
 */
export class ManagedUsersListResponse extends ApiResponse<ManagedUserResponseDto[]> {
  @ApiProperty({
    description: 'Liste der Benutzer',
    type: ManagedUserResponseDto,
    isArray: true,
  })
  data!: ManagedUserResponseDto[];
}

/**
 * Response-DTO für einen einzelnen Benutzer
 */
export class ManagedUserResponse extends ApiResponse<ManagedUserResponseDto> {
  @ApiProperty({
    description: 'Benutzerdaten',
    type: ManagedUserResponseDto,
  })
  data!: ManagedUserResponseDto;
}

/**
 * Response-DTO für Lösch-Operationen
 */
export class DeleteManagedUserResponse extends ApiResponse<{ id: string; deleted: boolean }> {
  @ApiProperty({
    description: 'Lösch-Bestätigung',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID des gelöschten Benutzers' },
      deleted: { type: 'boolean', description: 'Bestätigung der Löschung' },
    },
  })
  data!: { id: string; deleted: boolean };
}
