import { ApiProperty } from '@nestjs/swagger';

/**
 * GeoJSON Point Geometry DTO (RFC 7946).
 *
 * **WICHTIG:** Koordinaten sind [longitude, latitude] nach RFC 7946!
 * NICHT [lat, lng] wie bei einigen APIs ueblich.
 */
export class GeoJsonPointDto {
  @ApiProperty({
    description: 'GeoJSON Geometry Type',
    enum: ['Point'],
    example: 'Point',
  })
  readonly type: 'Point' = 'Point';

  @ApiProperty({
    description: 'Koordinaten als [longitude, latitude] nach RFC 7946',
    type: [Number],
    example: [7.123456, 51.456789],
    minItems: 2,
    maxItems: 2,
  })
  coordinates!: [number, number];

  constructor(longitude: number, latitude: number) {
    this.coordinates = [longitude, latitude];
  }
}

/**
 * GeoJSON Feature Properties DTO fuer Kraefte POIs.
 *
 * Enthaelt alle Metadaten zu einem Fahrzeug die auf der Lagekarte
 * angezeigt werden sollen.
 */
export class KraeftePoisPropertiesDto {
  @ApiProperty({
    description: 'Funkrufname des Fahrzeugs',
    example: 'Florian Heidelberg 1/46',
  })
  name!: string;

  @ApiProperty({
    description: 'Aktueller FMS-Status (0-9)',
    minimum: 0,
    maximum: 9,
    example: 3,
  })
  status!: number;

  @ApiProperty({
    description: 'Lesbares Status-Label (customLabel oder standardLabel)',
    example: 'Einsatz uebernommen',
  })
  statusLabel!: string;

  @ApiProperty({
    description: 'Farbe des Status als Hex-Code',
    example: '#FFA500',
    nullable: true,
  })
  statusFarbe!: string | null;

  @ApiProperty({
    description: 'Taktische Staerke (aus Fahrzeugtyp Sollbesatzung)',
    example: '1/2/6',
    nullable: true,
  })
  staerke!: string | null;

  @ApiProperty({
    description: 'Fahrzeugtyp-Code fuer Icon-Mapping',
    example: 'HLF',
  })
  fahrzeugtypCode!: string;

  @ApiProperty({
    description: 'Timestamp der letzten Positions-Aktualisierung (ISO 8601)',
    example: '2026-01-04T10:30:00.000Z',
  })
  positionTimestamp!: string;
}

/**
 * GeoJSON Feature DTO fuer ein einzelnes Fahrzeug.
 *
 * **WICHTIG:** Feature ID ist auf Feature-Ebene (nicht in properties)
 * nach RFC 7946 Best Practice.
 */
export class KraeftePoisFeatureDto {
  @ApiProperty({
    description: 'GeoJSON Feature Type',
    enum: ['Feature'],
    example: 'Feature',
  })
  readonly type: 'Feature' = 'Feature';

  @ApiProperty({
    description: 'Eindeutige Feature-ID (EinsatzFahrzeug ID)',
    example: 'clx1234567890abcdef12345',
  })
  id!: string;

  @ApiProperty({
    description: 'Point Geometry mit Fahrzeug-Position',
    type: GeoJsonPointDto,
  })
  geometry!: GeoJsonPointDto;

  @ApiProperty({
    description: 'Feature Properties mit Fahrzeug-Metadaten',
    type: KraeftePoisPropertiesDto,
  })
  properties!: KraeftePoisPropertiesDto;
}

/**
 * GeoJSON FeatureCollection DTO fuer alle Fahrzeuge eines Einsatzes.
 *
 * Enthaelt nur Fahrzeuge MIT gueltigiger Position.
 * Fahrzeuge ohne Position werden gefiltert.
 *
 * **RFC 7946 Compliance:**
 * - type: "FeatureCollection"
 * - features: Array von Feature Objekten
 * - Koordinaten: [longitude, latitude]
 * - ID auf Feature-Ebene (nicht in properties)
 */
export class KraeftePoisFeatureCollectionDto {
  @ApiProperty({
    description: 'GeoJSON FeatureCollection Type',
    enum: ['FeatureCollection'],
    example: 'FeatureCollection',
  })
  readonly type: 'FeatureCollection' = 'FeatureCollection';

  @ApiProperty({
    description: 'Array von Fahrzeug-Features',
    type: [KraeftePoisFeatureDto],
  })
  features!: KraeftePoisFeatureDto[];

  constructor(features: KraeftePoisFeatureDto[] = []) {
    this.features = features;
  }
}
