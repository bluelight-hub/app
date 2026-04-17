import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject } from 'class-validator';

const ALLOWED_GEOMETRY_TYPES = ['POLYGON', 'CIRCLE'] as const;

/**
 * Request-Body für `PATCH /einsatz/:einsatzId/gefahrenzonen/:zoneId/geometry`.
 *
 * Ändert ausschließlich die räumliche Ausdehnung. Matrix-Zuordnung wird nicht verändert —
 * dafür müsste die Zone neu erstellt werden.
 */
export class UpdateGefahrenzoneGeometryDto {
  @ApiProperty({ description: 'Geometrietyp: POLYGON oder CIRCLE', enum: ALLOWED_GEOMETRY_TYPES })
  @IsNotEmpty()
  @IsIn(ALLOWED_GEOMETRY_TYPES)
  geometryType!: (typeof ALLOWED_GEOMETRY_TYPES)[number];

  @ApiProperty({
    description: 'Aktualisiertes GeoJSON-Feature mit Polygon-Geometrie (RFC 7946).',
    type: 'object',
    additionalProperties: true,
  })
  @IsNotEmpty()
  @IsObject()
  geometry!: Record<string, unknown>;
}
