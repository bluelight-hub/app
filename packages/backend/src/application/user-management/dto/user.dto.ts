import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO für User-Responses im Application Layer.
 *
 * Read-Only Ansicht für API-Clients. Trennt Domain-Model
 * von API-Repräsentation.
 *
 * **Mapping von Domain Aggregate:**
 * - UserAggregate.id.toString() → id (string)
 * - UserAggregate.username.toString() → username (string)
 * - UserAggregate.role.toString() → role (string)
 * - UserAggregate.createdAt → createdAt (Date)
 * - UserAggregate.updatedAt → updatedAt (Date)
 * - UserAggregate.isLocked → isLocked (boolean)
 */
export class UserDto {
  @ApiProperty({
    description: 'Eindeutige ID des Benutzers (Nanoid)',
    example: 'X1Y2Z3A4B5C6D7E8F9G0H',
  })
  id!: string;

  @ApiProperty({
    description: 'Benutzername (unique, min 3 Zeichen)',
    example: 'max.mustermann',
  })
  username!: string;

  @ApiProperty({
    description: 'Rolle des Benutzers (RBAC)',
    enum: ['USER', 'ADMIN', 'SUPER_ADMIN'],
    example: 'USER',
  })
  role!: string;

  @ApiProperty({
    description: 'Erstellungsdatum',
    example: '2024-01-01T12:00:00.000Z',
  })
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

  @ApiPropertyOptional({
    description: 'Operative Rolle des Benutzers',
    enum: ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'],
    example: 'EXTERNE',
  })
  operativeRole?: string;

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
  stammperson?: { id: string; vorname: string; nachname: string; personalnummer: string } | null;
}
