import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO fuer QR-Code Registrierung (DRK-App Format).
 *
 * Die QR-Parameter werden vom Frontend geparst und hierher gemappt:
 * - QR "mnr" -> personalnummer
 * - QR "vn" -> vorname
 * - QR "nn" -> nachname
 * - QR "fk" -> funkkennung (optional)
 *
 * @see Story 4.2 - Person via QR-Code registrieren (AC2)
 */
export class RegistrierePersonViaQrCodeDto {
  @ApiProperty({
    description: 'Personalnummer aus QR-Code (DRK-Parameter "mnr")',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty({ message: 'Personalnummer ist erforderlich' })
  @MaxLength(50, { message: 'Personalnummer darf maximal 50 Zeichen lang sein' })
  personalnummer!: string;

  @ApiProperty({
    description: 'Vorname aus QR-Code (DRK-Parameter "vn")',
    example: 'Max',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vorname ist erforderlich' })
  @MaxLength(100, { message: 'Vorname darf maximal 100 Zeichen lang sein' })
  vorname!: string;

  @ApiProperty({
    description: 'Nachname aus QR-Code (DRK-Parameter "nn")',
    example: 'Mustermann',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nachname ist erforderlich' })
  @MaxLength(100, { message: 'Nachname darf maximal 100 Zeichen lang sein' })
  nachname!: string;

  @ApiPropertyOptional({
    description: 'BOS-Funkkennung aus QR-Code (DRK-Parameter "fk", optional)',
    example: '4711',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Funkkennung darf maximal 50 Zeichen lang sein' })
  funkkennung?: string;
}
