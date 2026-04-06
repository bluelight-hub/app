import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO zum Aktualisieren einer einzelnen Bewertung in der Gefahrenmatrix.
 */
export class UpdateGefahrenmatrixDto {
  @ApiProperty({ description: 'Gefahrentyp' })
  @IsNotEmpty()
  @IsString()
  gefahrentyp!: string;

  @ApiProperty({ description: 'Schutzobjekt' })
  @IsNotEmpty()
  @IsString()
  schutzobjekt!: string;

  @ApiProperty({ description: 'Neue Warnstufe' })
  @IsNotEmpty()
  @IsString()
  warnstufe!: string;

  @ApiProperty({ description: 'Optionale Beschreibung', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  beschreibung?: string;

  @ApiProperty({ description: 'Wer die Gefahr gemeldet hat', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  gemeldetVon?: string;
}
