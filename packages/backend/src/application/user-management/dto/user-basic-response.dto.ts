import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiResponse } from '@/shared/interfaces/api-response.interface';

/**
 * DTO für Basis-Benutzerinformationen.
 *
 * Enthält neben id und username einen optionalen `displayName`, der aus der
 * zugeordneten Stammperson (Vorname + Nachname) aufgelöst wird. UIs sollen
 * primär `displayName` anzeigen und auf `username` zurückfallen, wenn keine
 * Stammperson hinterlegt ist.
 */
export class UserBasicDto {
  /**
   * Eindeutige ID des Benutzers
   */
  @ApiProperty({
    description: 'Eindeutige ID des Benutzers',
    example: 'e2MVL-F3H2Audi4ud4pDG',
  })
  id!: string;

  /**
   * Benutzername
   */
  @ApiProperty({
    description: 'Benutzername',
    example: 'admin',
  })
  username!: string;

  /**
   * Anzeigename des Benutzers, aufgelöst aus der zugeordneten Stammperson
   * (`Vorname Nachname`). `null`, wenn keine Stammperson verknüpft ist.
   */
  @ApiPropertyOptional({
    description: 'Anzeigename aus der zugeordneten Stammperson (Vorname Nachname). Null, wenn keine Stammperson verknüpft ist.',
    type: String,
    nullable: true,
    example: 'Max Mustermann',
  })
  displayName?: string | null;
}

/**
 * Response-DTO für die Basis-Benutzerliste
 */
export class UserBasicListResponse extends ApiResponse<UserBasicDto[]> {
  @ApiProperty({
    description: 'Liste der Basis-Benutzerinformationen',
    type: UserBasicDto,
    isArray: true,
  })
  data!: UserBasicDto[];
}
