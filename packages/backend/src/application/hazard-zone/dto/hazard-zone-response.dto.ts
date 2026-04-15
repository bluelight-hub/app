import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für eine einzelne HazardZone (Issue #627).
 */
export class HazardZoneDto {
  @ApiProperty({ description: 'ID der HazardZone' })
  id!: string;

  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ description: 'Gefahrentyp aus der Gefahrenmatrix (z.B. BRAND, CHEMISCHE_STOFFE)' })
  gefahrentyp!: string;

  @ApiProperty({ description: 'Geometrie-Typ: POLYGON oder CIRCLE' })
  geometryType!: string;

  @ApiProperty({
    description: 'GeoJSON Geometrie (Polygon: { type: "Polygon", coordinates: [[[lng,lat],...]] }, Circle: { type: "Point", coordinates: [lng,lat] })',
    type: Object,
    additionalProperties: true,
  })
  geometry!: Record<string, unknown>;

  @ApiProperty({
    description: 'Radius in Metern (nur bei geometryType=CIRCLE)',
    required: false,
    nullable: true,
  })
  radiusMeters!: number | null;

  @ApiProperty({ description: 'Optionales Label der Zone', required: false, nullable: true })
  label!: string | null;

  @ApiProperty({ description: 'Optionale Beschreibung', required: false, nullable: true })
  beschreibung!: string | null;

  @ApiProperty({
    description: 'Aktuelle maximale Warnstufe über alle Schutzobjekte des Gefahrentyps (KEINE, NIEDRIG, MITTEL, HOCH, AKUT)',
  })
  maxWarnstufe!: string;

  @ApiProperty({ description: 'Zeitpunkt der Erstellung' })
  createdAt!: Date;

  @ApiProperty({ description: 'Zeitpunkt der letzten Aktualisierung' })
  updatedAt!: Date;

  @ApiProperty({ description: 'User-ID des Erstellers' })
  createdBy!: string;

  @ApiProperty({ description: 'User-ID des letzten Bearbeiters' })
  updatedBy!: string;
}

/**
 * DTO für die Liste aller HazardZones eines Einsatzes.
 */
export class HazardZoneListResponseDto {
  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ type: [HazardZoneDto], description: 'Alle Zonen des Einsatzes' })
  zones!: HazardZoneDto[];
}
