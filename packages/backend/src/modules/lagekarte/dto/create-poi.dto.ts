import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsNumber, IsObject, MaxLength, ValidateIf, Min, Max } from 'class-validator';
import { PoiType } from '@prisma/client';
import { IsCoordinatesOrAddress } from '../validators/coordinates-or-address.validator';

/**
 * DTO für POI-Erstellung
 *
 * **Koordinaten-Strategie:**
 * - Option 1 (PRIMÄR): `mgrs` angeben → MGRS-Koordinaten (z.B. "33UVU1234567890")
 * - Option 2 (FALLBACK): `latitude` + `longitude` manuell angeben
 * - Option 3 (GEOCODING): `adresse` angeben → Automatisches Geocoding
 * - Validierung: Mindestens EINE der drei Optionen erforderlich
 *
 * **Priorität:**
 * - MGRS hat Vorrang vor Lat/Lng bei der Speicherung
 * - Wenn MGRS gesetzt ist, werden Lat/Lng automatisch berechnet
 * - Lat/Lng dient als Fallback für Systeme ohne MGRS-Support
 *
 * **Validierung:**
 * - Custom Validator `@IsCoordinatesOrAddress()` stellt sicher, dass eine der drei Optionen gesetzt ist
 * - Koordinaten-Range: latitude [-90, 90], longitude [-180, 180]
 * - MGRS-Format: Max. 20 Zeichen (z.B. "33UVU1234567890")
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
    description: 'MGRS Koordinaten (primäres Format, alternativ zu latitude/longitude oder adresse)',
    example: '33UVU1234567890',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @ValidateIf((o) => !o.latitude || !o.longitude || !o.adresse || o.mgrs !== undefined)
  mgrs?: string;

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
    description: 'Geografische Breite (optional, wird aus MGRS berechnet oder manuell angegeben)',
    example: 52.52,
    minimum: -90,
    maximum: 90,
  })
  @ValidateIf((o) => (!o.mgrs && !o.adresse) || o.latitude !== undefined)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsCoordinatesOrAddress()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Geografische Länge (optional, wird aus MGRS berechnet oder manuell angegeben)',
    example: 13.405,
    minimum: -180,
    maximum: 180,
  })
  @ValidateIf((o) => (!o.mgrs && !o.adresse) || o.longitude !== undefined)
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
  metadata?: Record<string, unknown>;
}
