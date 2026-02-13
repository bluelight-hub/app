import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Request DTO zum Erstellen einer neuen Erinnerungsvorlage.
 */
export class CreateErinnerungsvorlageDto {
  @ApiProperty({
    description: 'Titel der Vorlage (erforderlich, max 100 Zeichen)',
    example: 'Lagebesprechung',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Titel ist erforderlich' })
  @IsString({ message: 'Titel muss ein String sein' })
  @MaxLength(100, { message: 'Titel darf maximal 100 Zeichen lang sein' })
  titel!: string;

  @ApiProperty({
    description: 'Zeitdauer in Minuten (relative Zeit)',
    example: 30,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Minuten ist erforderlich' })
  @IsInt({ message: 'Minuten muss eine ganze Zahl sein' })
  @Min(1, { message: 'Minuten muss mindestens 1 sein' })
  minuten!: number;

  @ApiProperty({
    description: 'Optionale Beschreibung (max 500 Zeichen)',
    example: 'Regelmäßige Lagebesprechung im ELW',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Beschreibung muss ein String sein' })
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  beschreibung?: string;
}
