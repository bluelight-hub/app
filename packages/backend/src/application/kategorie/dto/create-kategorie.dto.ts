import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

/**
 * Request DTO zum Erstellen einer neuen Kategorie.
 */
export class CreateKategorieDto {
  @ApiProperty({
    description: 'Name der Kategorie (erforderlich, max 100 Zeichen)',
    example: 'Einsatzleitung',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name ist erforderlich' })
  @IsString({ message: 'Name muss ein String sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name!: string;

  @ApiProperty({
    description: 'Farbe der Kategorie als Hex-Code (erforderlich, Format: #RRGGBB)',
    example: '#FF5733',
    pattern: '^#[0-9a-fA-F]{6}$',
  })
  @IsNotEmpty({ message: 'Farbe ist erforderlich' })
  @IsString({ message: 'Farbe muss ein String sein' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Farbe muss ein gültiger Hex-Code sein (z.B. #FF5733)' })
  farbe!: string;
}
