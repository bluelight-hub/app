import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

/**
 * Request DTO zum Ändern der operativen Rolle eines Users.
 *
 * Validiert den neuen Rollenwert gegen die erlaubten Werte.
 *
 * @example
 * ```json
 * {
 *   "operativeRole": "FUEHRUNGSKRAFT"
 * }
 * ```
 */
export class ChangeOperativeRoleDto {
  /**
   * Die neue operative Rolle des Users.
   */
  @ApiProperty({
    description: 'Die neue operative Rolle',
    enum: ['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'],
    example: 'FUEHRUNGSKRAFT',
  })
  @IsString({ message: 'operativeRole muss ein String sein' })
  @IsIn(['FUEHRUNGSKRAFT', 'EINSATZKRAFT', 'EXTERNE'], {
    message: 'operativeRole muss FUEHRUNGSKRAFT, EINSATZKRAFT oder EXTERNE sein',
  })
  operativeRole!: string;
}
