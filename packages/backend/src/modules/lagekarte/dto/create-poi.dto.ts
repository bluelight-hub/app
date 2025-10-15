import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsNumber, IsObject, MaxLength, ValidateIf, Min, Max } from 'class-validator';
import { PoiType } from '@prisma/client';
import { IsCoordinatesOrAddress } from '../validators/coordinates-or-address.validator';

/**
 * DTO für POI-Erstellung
 *
 * **Koordinaten-Strategie:**
 * - Option 1: `adresse` angeben → Automatisches Geocoding
 * - Option 2: `latitude` + `longitude` manuell angeben (wenn Geocoding fehlschlägt)
 * - Validierung: Mindestens `adresse` ODER (`latitude` + `longitude`) erforderlich
 *
 * **Validierung:**
 * - Custom Validator `@IsCoordinatesOrAddress()` stellt sicher, dass eine der beiden Optionen gesetzt ist
 * - Koordinaten-Range: latitude [-90, 90], longitude [-180, 180]
 */
export class CreatePoiDto {
  @ApiProperty({
    description: 'ID der zugehörigen Lagekarte',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  @IsString()
  lagekarteId!: string;

  @ApiProperty({
    enum: PoiType,
    description: 'Typ des POI (z.B. EINSATZORT, FAHRZEUG, GEFAHRENQUELLE)',
    example: 'EINSATZORT',
  })
  @IsEnum(PoiType, {
    message: `type must be one of: ${Object.values(PoiType).join(', ')}`,
  })
  type!: PoiType;

  @ApiPropertyOptional({
    description: 'Name/Bezeichnung des POI',
    example: 'Haupteinsatzstelle',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Adresse für automatisches Geocoding',
    example: 'Hauptstraße 1, 10115 Berlin',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adresse?: string;

  @ApiPropertyOptional({
    description: 'Geografische Breite (erforderlich wenn keine Adresse angegeben)',
    example: 52.52,
    minimum: -90,
    maximum: 90,
  })
  @ValidateIf((o) => !o.adresse || o.latitude !== undefined)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsCoordinatesOrAddress()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Geografische Länge (erforderlich wenn keine Adresse angegeben)',
    example: 13.405,
    minimum: -180,
    maximum: 180,
  })
  @ValidateIf((o) => !o.adresse || o.longitude !== undefined)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Icon-Identifier für Kartendarstellung',
    example: 'fire-station',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Zusätzliche Metadaten als JSON',
    example: { color: 'red', size: 'large' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
