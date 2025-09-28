import { ApiResponse } from '@/common/interfaces/api-response.interface';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für Basis-Benutzerinformationen
 */
export class UserBasicDto {
  @ApiProperty({
    description: 'Eindeutige ID des Benutzers',
    example: 'e2MVL-F3H2Audi4ud4pDG',
  })
  id!: string;

  @ApiProperty({
    description: 'Benutzername',
    example: 'admin',
  })
  username!: string;
}

/**
 * Response-DTO für die Basis-Benutzerliste
 */
export class UserBasicListResponse extends ApiResponse<UserBasicDto[]> {
  @ApiProperty({
    description: 'Liste der Basis-Benutzerinformationen',
    type: [UserBasicDto],
  })
  data!: UserBasicDto[];
}
