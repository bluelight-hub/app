import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject } from 'class-validator';

/**
 * DTO für Lagekarte-State-Speicherung
 *
 * **GeoJSON Format:**
 * Der State enthält Zeichnungen (Polygone, Linien, Marker) im GeoJSON FeatureCollection Format.
 *
 * @example
 * ```json
 * {
 *   "einsatzId": "clw3h8x9y0000qwertyuiopas",
 *   "state": {
 *     "type": "FeatureCollection",
 *     "features": [
 *       {
 *         "type": "Feature",
 *         "geometry": {
 *           "type": "Polygon",
 *           "coordinates": [[[13.4, 52.5], [13.5, 52.5], [13.5, 52.6], [13.4, 52.6], [13.4, 52.5]]]
 *         },
 *         "properties": {
 *           "name": "Sperrbereich",
 *           "color": "red"
 *         }
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export class SaveLagekarteStateDto {
  @ApiProperty({
    description: 'ID des zugehörigen Einsatzes',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  @IsString()
  einsatzId!: string;

  @ApiProperty({
    description: 'GeoJSON FeatureCollection mit Zeichnungen',
    example: {
      type: 'FeatureCollection',
      features: [],
    },
  })
  @IsObject()
  state!: object;
}
