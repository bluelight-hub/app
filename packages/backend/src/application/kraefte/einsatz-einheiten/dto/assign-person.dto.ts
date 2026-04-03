import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO für die Zuweisung einer Person zu einer taktischen Einheit.
 *
 * **Validierung:**
 * - personId muss eine gültige EinsatzPerson-ID sein
 * - Person und Einheit müssen zum gleichen Einsatz gehören
 * - Doppelte Zuweisungen werden durch Business Logic verhindert
 */
export class AssignPersonToEinheitDto {
  @ApiProperty({
    description: 'EinsatzPerson-ID der zuzuweisenden Person (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  @IsString()
  @IsNotEmpty()
  personId!: string;
}
