import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO für die Position-Validierung.
 *
 * WGS84 Koordinaten mit gültigen Bereichen.
 */
export class PositionDto {
  @ApiProperty({
    description: 'Breitengrad (WGS84)',
    minimum: -90,
    maximum: 90,
    example: 49.4094,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({
    description: 'Längengrad (WGS84)',
    minimum: -180,
    maximum: 180,
    example: 8.6944,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

/**
 * DTO für das Erfassen eines Fahrzeugs aus Stammdaten.
 *
 * **AC1 - Stammdaten-Fahrzeug auswählen:**
 * Der User wählt ein existierendes StammFahrzeug aus der Liste.
 * Die stammId identifiziert das ausgewählte Fahrzeug.
 *
 * **AC2 - Snapshot Pattern:**
 * Backend lädt StammFahrzeug und KOPIERT funkrufname, kennzeichen, fahrzeugtypId.
 * Diese Daten werden im EinsatzFahrzeug persistent gespeichert.
 */
export class ErfasseFahrzeugAusStammdatenDto {
  @ApiProperty({
    description: 'Stamm-Fahrzeug-ID des zu erfassenden Fahrzeugs (CUID2)',
    example: 'cuid2abc123def456ghi',
  })
  @IsString()
  @IsNotEmpty()
  stammId!: string;

  @ApiPropertyOptional({
    description: 'Optionale initiale GPS-Position (z.B. aktuelle Fahrzeugposition)',
    type: PositionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;
}
