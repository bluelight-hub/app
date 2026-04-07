import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NinaGeoJsonPropertiesDto {
  @ApiProperty({ description: 'Warnungs-ID' })
  id!: string;

  @ApiProperty({ description: 'Schweregrad' })
  severity!: string;

  @ApiProperty({ description: 'Titel der Warnung' })
  title!: string;

  @ApiProperty({ description: 'Quelle (katwarn, biwapp, mowas, lhp, police)' })
  source!: string;

  @ApiPropertyOptional({ description: 'Beginn der Warnung (ISO-8601)' })
  startDate?: string;
}

export class NinaGeoJsonFeatureDto {
  @ApiProperty({ example: 'Feature' })
  type!: string;

  @ApiProperty({ type: NinaGeoJsonPropertiesDto })
  properties!: NinaGeoJsonPropertiesDto;

  @ApiPropertyOptional({ description: 'GeoJSON Geometrie' })
  geometry!: Record<string, unknown> | null;
}

export class NinaGeoJsonFeatureCollectionDto {
  @ApiProperty({ example: 'FeatureCollection' })
  type!: string;

  @ApiProperty({ type: [NinaGeoJsonFeatureDto] })
  features!: NinaGeoJsonFeatureDto[];
}
