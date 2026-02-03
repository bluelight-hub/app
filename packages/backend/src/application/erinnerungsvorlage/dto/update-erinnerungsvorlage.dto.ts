import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Request DTO zum Aktualisieren einer Erinnerungsvorlage.
 * Alle Felder sind optional (Partial Update).
 */
export class UpdateErinnerungsvorlageDto {
  @ApiProperty({
    description: 'Titel der Vorlage (max 100 Zeichen)',
    example: 'Lagebesprechung',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Titel muss ein String sein' })
  @MaxLength(100, { message: 'Titel darf maximal 100 Zeichen lang sein' })
  titel?: string;

  @ApiProperty({
    description: 'Zeitdauer in Minuten',
    example: 30,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Minuten muss eine ganze Zahl sein' })
  @Min(1, { message: 'Minuten muss mindestens 1 sein' })
  minuten?: number;

  @ApiProperty({
    description: 'Optionale Beschreibung (max 500 Zeichen, null zum Entfernen)',
    example: 'Regelmäßige Lagebesprechung im ELW',
    required: false,
    nullable: true,
    maxLength: 500,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Beschreibung muss ein String sein' })
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  beschreibung?: string | null;
}
