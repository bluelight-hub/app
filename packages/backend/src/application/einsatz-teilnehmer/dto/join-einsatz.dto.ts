import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO für den Einsatz-Beitritt Request.
 *
 * Wird verwendet wenn ein User einem Einsatz mit einer EinsatzPerson beitritt.
 */
export class JoinEinsatzDto {
  @ApiProperty({
    description: 'ID der EinsatzPerson mit der sich der User verknüpfen möchte',
    example: 'clx1234567890abcdefghijk',
  })
  @IsString({ message: 'einsatzPersonId muss ein String sein' })
  @IsNotEmpty({ message: 'einsatzPersonId darf nicht leer sein' })
  einsatzPersonId!: string;
}
