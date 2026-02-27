import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO fuer BefehlEmpfaenger in API-Responses.
 *
 * Repraesentiert einen einzelnen Empfaenger eines Befehls
 * mit individuellem Zustellungs- und Quittierungsstatus.
 */
export class BefehlEmpfaengerDto {
  @ApiProperty({ description: 'Empfaenger-Eintrag ID', example: 'clw3h8x9y0005qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Empfaenger Display-Name', example: 'ZF Meier' })
  name!: string;

  @ApiPropertyOptional({ description: 'Empfaenger User-ID (optional)', example: 'clw3h8x9y0001qwertyuiopas' })
  empfaengerId?: string;

  @ApiPropertyOptional({ description: 'Zeitpunkt der Zustellung', example: '2024-01-15T10:35:00.000Z' })
  zugestelltAm?: Date;

  @ApiPropertyOptional({ description: 'Zeitpunkt der Quittierung', example: '2024-01-15T10:40:00.000Z' })
  quittiertAm?: Date;

  @ApiPropertyOptional({
    description: 'Art der Quittierung',
    enum: ['VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN'],
    example: 'VERSTANDEN',
  })
  quittierungArt?: string;

  @ApiPropertyOptional({ description: 'Kommentar zur Quittierung' })
  quittierungKommentar?: string;

  @ApiProperty({ description: 'Ob der Empfaenger quittierbar ist (mit User verknuepft)', example: true })
  istQuittierbar!: boolean;
}
