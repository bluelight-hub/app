import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request DTO zum Aktualisieren einer Notiz (Story 7.3).
 * Partial Update: Alle Felder optional, null = explizit leeren.
 */
export class UpdateNotizDto {
  @ApiProperty({
    description: 'Titel der Notiz (max 100 Zeichen)',
    example: 'Lagebericht aktualisiert',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Titel muss ein String sein' })
  @MaxLength(100, { message: 'Titel darf maximal 100 Zeichen lang sein' })
  titel?: string;

  @ApiProperty({
    description: 'Inhalt der Notiz (max 2000 Zeichen, null zum Entfernen)',
    example: 'Neuer Inhalt...',
    required: false,
    nullable: true,
    maxLength: 2000,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Inhalt muss ein String sein' })
  @MaxLength(2000, { message: 'Inhalt darf maximal 2000 Zeichen lang sein' })
  inhalt?: string | null;

  @ApiProperty({
    description: 'Kategorie der Notiz (max 50 Zeichen, null zum Entfernen)',
    example: 'Lage',
    required: false,
    nullable: true,
    maxLength: 50,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Kategorie muss ein String sein' })
  @MaxLength(50, { message: 'Kategorie darf maximal 50 Zeichen lang sein' })
  kategorie?: string | null;

  @ApiProperty({
    description: 'Ob die Notiz fuer das Team sichtbar ist',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'istTeamsichtbar muss ein Boolean sein' })
  istTeamsichtbar?: boolean;

  /**
   * Story 8.2: Kategorie-ID (null = Kategorie entfernen).
   *
   * @example "clw3h8x9y0008kategorie123"
   */
  @ApiPropertyOptional({ description: 'Kategorie-ID (null = Kategorie entfernen)', nullable: true })
  @IsOptional()
  @IsString()
  kategorieId?: string | null;
}
