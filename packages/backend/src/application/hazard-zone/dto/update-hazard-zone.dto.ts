import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsObject, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/**
 * DTO zum Aktualisieren einer bestehenden HazardZone (Issue #627).
 *
 * Alle Felder sind optional. Geometrie-Änderungen erfordern kohärente Werte
 * (z.B. bei Wechsel auf CIRCLE auch radiusMeters mitsenden).
 */
export class UpdateHazardZoneDto {
  @ApiProperty({ description: 'Gefahrentyp', required: false })
  @IsOptional()
  @IsString()
  gefahrentyp?: string;

  @ApiProperty({ description: 'Geometrie-Typ', enum: ['POLYGON', 'CIRCLE'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['POLYGON', 'CIRCLE'])
  geometryType?: string;

  @ApiProperty({ description: 'GeoJSON Geometrie', required: false, type: Object, additionalProperties: true })
  @IsOptional()
  @IsObject()
  geometry?: Record<string, unknown>;

  @ApiProperty({ description: 'Radius in Metern (bei CIRCLE)', required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  radiusMeters?: number | null;

  @ApiProperty({ description: 'Label der Zone', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiProperty({ description: 'Beschreibung der Zone', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  beschreibung?: string;
}
