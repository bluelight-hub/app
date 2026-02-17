import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO fuer BefehlKommentar in API-Responses.
 *
 * Repraesentiert einen Kommentar zu einem Befehl,
 * mit Thread-Support via parentId fuer verschachtelte Antworten.
 */
export class BefehlKommentarDto {
  @ApiProperty({ description: 'Kommentar-ID', example: 'clw3h8x9y0006qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Autor User-ID', example: 'clw3h8x9y0001qwertyuiopas' })
  authorId!: string;

  @ApiProperty({ description: 'Kommentar-Text', example: 'Rueckfrage: Welcher Eingang genau?' })
  text!: string;

  @ApiProperty({ description: 'Ob der Kommentar eine Rueckfrage ist', example: true })
  isRueckfrage!: boolean;

  @ApiPropertyOptional({
    description: 'Parent-Kommentar-ID fuer Thread-Antworten',
    example: 'clw3h8x9y0007qwertyuiopas',
  })
  parentId?: string;

  @ApiProperty({ description: 'Erstellungszeitpunkt', example: '2024-01-15T10:45:00.000Z' })
  createdAt!: Date;
}
