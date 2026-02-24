import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO für das Hinzufügen eines Kommentars zu einem Befehl.
 * authorId kommt aus JWT Token, NICHT vom Client.
 */
export class AddBefehlKommentarDto {
  @ApiProperty({ description: 'Kommentar-Text' })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({ description: 'Ob der Kommentar eine Rueckfrage ist' })
  @IsBoolean()
  isRueckfrage!: boolean;

  @ApiPropertyOptional({ description: 'Parent-Kommentar-ID fuer Thread-Antworten' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
