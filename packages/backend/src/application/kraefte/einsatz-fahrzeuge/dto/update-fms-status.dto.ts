import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, ValidateNested, IsNumber, IsNotEmptyObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO für die Position-Validierung bei FMS-Status-Updates.
 *
 * GPS Position gemäß WGS84 Standard.
 *
 * Latitude: -90° (Südpol) bis +90° (Nordpol)
 * Longitude: -180° (Westgrenze) bis +180° (Ostgrenze)
 *
 * **Defense in Depth:**
 * Position wird SOWOHL hier (DTO via class-validator) ALS AUCH im Command validiert.
 * Dies ist beabsichtigt um mehrschichtige Validierung zu gewährleisten:
 * - DTO Layer: HTTP Request Validierung (class-validator + Swagger)
 * - Command Layer: Business Logic Validierung (inkl. NaN/Infinity Checks)
 *
 * @see https://de.wikipedia.org/wiki/World_Geodetic_System_1984
 */
export class GeoPositionDto {
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
 * DTO für das Updaten des FMS-Status eines Einsatz-Fahrzeugs.
 *
 * **AC3 - FMS-Status ändern:**
 * Der User ändert den FMS-Status eines bereits erfassten Fahrzeugs.
 * Der neue Status muss im Bereich 0-9 liegen (FMS-Standard).
 *
 * **AC4 - Optional: GPS-Position mitgeben:**
 * Bei mobilen Clients (z.B. Tablet im Fahrzeug) kann die aktuelle
 * GPS-Position zusammen mit dem Status-Update übermittelt werden.
 */
export class UpdateFmsStatusDto {
  @ApiProperty({
    description: 'Neuer FMS-Status (0-9)',
    minimum: 0,
    maximum: 9,
    example: 3,
  })
  @IsInt()
  @Min(0)
  @Max(9)
  fmsStatus!: number;

  @ApiPropertyOptional({
    description: 'Optionale GPS-Position (z.B. von mobilem Client)',
    type: GeoPositionDto,
  })
  @IsOptional()
  @IsNotEmptyObject({ nullable: true })
  @ValidateNested()
  @Type(() => GeoPositionDto)
  position?: GeoPositionDto;
}
