import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request DTO zum Erstellen einer neuen Notiz.
 */
export class CreateNotizDto {
  @ApiProperty({
    description: 'Titel der Notiz (erforderlich, max 100 Zeichen)',
    example: 'Lagebericht Abschnitt B',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Titel ist erforderlich' })
  @IsString({ message: 'Titel muss ein String sein' })
  @MaxLength(100, { message: 'Titel darf maximal 100 Zeichen lang sein' })
  titel!: string;

  @ApiProperty({
    description: 'Inhalt der Notiz (optional, max 2000 Zeichen)',
    example: 'Abschnitt B: 3 Verletzte, RTW angefordert',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Inhalt muss ein String sein' })
  @MaxLength(2000, { message: 'Inhalt darf maximal 2000 Zeichen lang sein' })
  inhalt?: string;

  @ApiProperty({
    description: 'Kategorie der Notiz (optional, Freitext, max 50 Zeichen)',
    example: 'Lage',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Kategorie muss ein String sein' })
  @MaxLength(50, { message: 'Kategorie darf maximal 50 Zeichen lang sein' })
  kategorie?: string;

  @ApiProperty({
    description: 'Ob die Notiz fuer das Team sichtbar ist (Default: false)',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'istTeamsichtbar muss ein Boolean sein' })
  istTeamsichtbar?: boolean;

  /**
   * Story 8.2: Optionale Kategorie-ID zur Kategorisierung.
   *
   * @example "clw3h8x9y0008kategorie123"
   */
  @ApiPropertyOptional({ description: 'Optionale Kategorie-ID' })
  @IsOptional()
  @IsString()
  kategorieId?: string;
}
