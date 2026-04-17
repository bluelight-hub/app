import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

const ALLOWED_GEOMETRY_TYPES = ['POLYGON', 'CIRCLE'] as const;

/**
 * Request-Body für `POST /einsatz/:einsatzId/gefahrenzonen`.
 *
 * Die Matrix-Referenz (`gefahrentyp` + `schutzobjekt`) ist Pflicht — die Matrix-Zelle wird
 * bei fehlender Bewertung serverseitig mit `warnstufe=KEINE` angelegt (Quick-Draw-Flow).
 */
export class CreateGefahrenzoneDto {
  @ApiProperty({ description: 'Gefahrentyp der Matrix-Zelle (z. B. ATEMGIFTE, BRAND, ...)' })
  @IsNotEmpty()
  @IsString()
  gefahrentyp!: string;

  @ApiProperty({ description: 'Schutzobjekt der Matrix-Zelle (MENSCHEN, TIERE, UMWELT, SACHWERTE, EINSATZKRAEFTE)' })
  @IsNotEmpty()
  @IsString()
  schutzobjekt!: string;

  @ApiProperty({ description: 'Geometrietyp: POLYGON oder CIRCLE', enum: ALLOWED_GEOMETRY_TYPES })
  @IsNotEmpty()
  @IsIn(ALLOWED_GEOMETRY_TYPES)
  geometryType!: (typeof ALLOWED_GEOMETRY_TYPES)[number];

  @ApiProperty({
    description: 'GeoJSON-Feature mit Polygon-Geometrie (RFC 7946). Bei CIRCLE empfehlen wir serverseitige Konversion — der Client schickt dennoch ein bereits approximiertes Polygon.',
    type: 'object',
    additionalProperties: true,
  })
  @IsNotEmpty()
  @IsObject()
  geometry!: Record<string, unknown>;

  @ApiProperty({ description: 'Optionales Panel-Label (max. 200 Zeichen)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bezeichnung?: string;
}
