import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für operative Rollen-Änderungen.
 *
 * Wird sowohl für ChangeOperativeRole als auch AssignStammperson Antworten verwendet.
 *
 * @example
 * ```json
 * {
 *   "userId": "clx_user_abc123",
 *   "message": "Operative Rolle erfolgreich geändert"
 * }
 * ```
 */
export class OperativeRoleResponseDto {
  /**
   * ID des betroffenen Users.
   */
  @ApiProperty({
    description: 'ID des betroffenen Users',
    example: 'clx_user_abc123',
  })
  userId!: string;

  /**
   * Statusmeldung der Operation.
   */
  @ApiProperty({
    description: 'Statusmeldung',
    example: 'Operative Rolle erfolgreich geändert',
  })
  message!: string;
}
