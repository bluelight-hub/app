import { ApiProperty } from '@nestjs/swagger';

/**
 * Minimale User-Daten für den "Externe einladen" Dialog.
 *
 * Gibt nur ID und Username zurück — keine sensiblen Daten.
 */
export class ExterneUserDto {
  @ApiProperty({
    description: 'Eindeutige User-ID',
    example: 'clx1234567890abcdefghijk',
  })
  id!: string;

  @ApiProperty({
    description: 'Benutzername',
    example: 'max.mustermann',
  })
  username!: string;
}
