import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für die öffentliche Benutzerliste
 *
 * Enthält nur die für die Anmeldung notwendigen Informationen
 */
export class PublicUserDto {
  @ApiProperty({
    description: 'Eindeutiger Benutzername',
    example: 'max.mustermann',
  })
  username: string;
}

/**
 * DTO für die Antwort der öffentlichen Benutzerliste
 */
export class PublicUsersResponseDto {
  @ApiProperty({
    description: 'Liste der verfügbaren Benutzer',
    type: [PublicUserDto],
    example: [{ username: 'max.mustermann' }, { username: 'erika.musterfrau' }],
  })
  users: PublicUserDto[];
}
