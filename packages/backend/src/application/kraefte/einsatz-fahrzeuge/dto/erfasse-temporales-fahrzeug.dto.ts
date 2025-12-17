import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO für das Erfassen eines temporären Fahrzeugs.
 *
 * **AC1 - Temporäres Fahrzeug anlegen:**
 * Der User gibt manuell funkrufname, fahrzeugtypId und optional kennzeichen ein.
 * Es wird KEIN StammFahrzeug referenziert (stammId ist undefined).
 *
 * **AC3 - Fahrzeugtyp-Validierung:**
 * Backend prüft ob Fahrzeugtyp existiert.
 */
export class ErfasseTemporalesFahrzeugDto {
  @ApiProperty({
    description: 'Funkrufname des temporären Fahrzeugs (1-100 Zeichen)',
    example: 'RTW 1',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  funkrufname!: string;

  @ApiProperty({
    description: 'Fahrzeugtyp-ID für Kategorisierung (CUID2)',
    example: 'cuid2fahrzeugtyp123',
  })
  @IsString()
  @IsNotEmpty()
  fahrzeugtypId!: string;

  @ApiPropertyOptional({
    description: 'Optionales Kennzeichen (max 20 Zeichen)',
    example: 'DA-RK 101',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  kennzeichen?: string;

  @ApiPropertyOptional({
    description: 'Optionale initiale GPS-Position (z.B. aktuelle Fahrzeugposition)',
    example: { lat: 49.4094, lng: 8.6944 },
  })
  @IsOptional()
  position?: { lat: number; lng: number };
}
