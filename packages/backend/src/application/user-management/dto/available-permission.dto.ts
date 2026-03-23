import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO fuer eine verfuegbare Permission-Domain mit ihren Actions.
 *
 * Repraesentiert eine Gruppe von Permissions die vergeben werden koennen.
 */
export class AvailablePermissionDto {
  @ApiProperty({
    description: 'Permission-Domain',
    example: 'nav',
  })
  domain!: string;

  @ApiProperty({
    description: 'Verfuegbare Actions in dieser Domain',
    example: ['stammdaten', 'berechtigungen', 'integrationen', 'ueberblick', 'etb', 'befehle'],
    type: [String],
  })
  actions!: string[];

  @ApiProperty({
    description: 'Beschreibung der Domain',
    example: 'Navigationsbereiche',
  })
  description!: string;
}
