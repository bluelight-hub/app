import { ApiProperty } from '@nestjs/swagger';
import { ApiResponse } from '@/shared/interfaces/api-response.interface';

/**
 * DTO fuer die Permission eines Users.
 */
export class UserPermissionDto {
  @ApiProperty({
    description: 'Permission-Wert im Format domain:action',
    example: 'nav:stammdaten',
  })
  permission!: string;
}

/**
 * Response-DTO fuer die Permission-Liste eines Users.
 */
export class UserPermissionsListResponse extends ApiResponse<UserPermissionDto[]> {
  @ApiProperty({
    description: 'Liste der Custom Permissions',
    type: UserPermissionDto,
    isArray: true,
  })
  data!: UserPermissionDto[];
}
