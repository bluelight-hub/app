import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/**
 * DTO zum Erstellen einer neuen HazardZone (Issue #627).
 */
export class CreateHazardZoneDto {
  @ApiProperty({ description: 'Gefahrentyp aus der Gefahrenmatrix (z.B. BRAND, CHEMISCHE_STOFFE)' })
  @IsNotEmpty()
  @IsString()
  gefahrentyp!: string;

  @ApiProperty({ description: 'Geometrie-Typ', enum: ['POLYGON', 'CIRCLE'] })
  @IsNotEmpty()
  @IsString()
  @IsIn(['POLYGON', 'CIRCLE'])
  geometryType!: string;

  @ApiProperty({
    description: 'GeoJSON-Geometrie. POLYGON: { type:"Polygon", coordinates:[[[lng,lat],...]] }, CIRCLE: { type:"Point", coordinates:[lng,lat] }',
    type: Object,
    additionalProperties: true,
  })
  @IsObject()
  geometry!: Record<string, unknown>;

  @ApiProperty({
    description: 'Radius in Metern (Pflicht bei geometryType=CIRCLE, sonst null)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  radiusMeters?: number | null;

  @ApiProperty({ description: 'Optionales Label', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiProperty({ description: 'Optionale Beschreibung', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  beschreibung?: string;
}
