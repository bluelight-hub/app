import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Request DTO zum Zuweisen einer Stammperson zu einem User.
 *
 * stammpersonId kann null sein, um die Zuweisung zu entfernen.
 *
 * @example
 * ```json
 * {
 *   "stammpersonId": "clx_stammperson_xyz789"
 * }
 * ```
 */
export class AssignStammpersonDto {
  /**
   * ID der Stammperson. Null zum Entfernen der Zuweisung.
   */
  @ApiProperty({
    description: 'ID der Stammperson (null zum Entfernen)',
    example: 'clx_stammperson_xyz789',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'stammpersonId muss ein String sein' })
  stammpersonId!: string | null;
}
