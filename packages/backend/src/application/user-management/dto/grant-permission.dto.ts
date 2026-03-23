import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * DTO fuer das Gewaehren einer Custom Permission.
 *
 * Permission-Format: `<domain>:<action>` (lowercase, underscore erlaubt).
 * Beispiele: `nav:stammdaten`, `einsatz:create`, `etb:lock`
 */
export class GrantPermissionDto {
  @ApiProperty({
    description: 'Permission im Format domain:action (lowercase)',
    example: 'nav:stammdaten',
    pattern: '^[a-z_]+:[a-z_]+$',
  })
  @IsString({ message: 'Permission muss ein String sein' })
  @Matches(/^[a-z_]+:[a-z_]+$/, {
    message: 'Permission muss dem Format domain:action entsprechen (lowercase, underscore erlaubt)',
  })
  permission!: string;
}
