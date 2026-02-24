import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO fuer die Quittierung eines Befehls durch einen Empfaenger.
 *
 * **Validierungsregeln:**
 * - empfaengerId: String (Pflicht)
 * - quittierungArt: Einer von VERSTANDEN, RUECKFRAGE, NICHT_VERSTANDEN (Pflicht)
 */
export class QuittierenBefehlDto {
  @ApiProperty({ description: 'ID des quittierenden Empfaengers', example: 'clw3h8x9y0001qwertyuiopas' })
  @IsNotEmpty()
  @IsString()
  empfaengerId!: string;

  @ApiProperty({
    description: 'Art der Quittierung',
    enum: ['VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN'],
    example: 'VERSTANDEN',
  })
  @IsString()
  @IsIn(['VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN'])
  quittierungArt!: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';
}
