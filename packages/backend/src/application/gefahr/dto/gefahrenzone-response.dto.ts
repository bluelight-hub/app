import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für eine einzelne Gefahrenzone inkl. der abgeleiteten Warnstufe aus der Matrix.
 *
 * `warnstufe` ist `null`, wenn die verknüpfte Matrix-Zelle noch `KEINE` ist oder noch
 * nicht bewertet wurde (Quick-Draw-Flow — Zone existiert vor der Bewertung, ADR-010).
 */
export class GefahrenzoneDto {
  @ApiProperty({ description: 'Eindeutige Zone-ID' })
  id!: string;

  @ApiProperty({ description: 'Einsatz-ID, zu dem die Zone gehört' })
  einsatzId!: string;

  @ApiProperty({ description: 'Referenzierter Gefahrentyp der Matrix-Zelle' })
  gefahrentyp!: string;

  @ApiProperty({ description: 'Referenziertes Schutzobjekt der Matrix-Zelle' })
  schutzobjekt!: string;

  @ApiProperty({ description: 'Geometrietyp (POLYGON | CIRCLE). CIRCLE wird serverseitig als 64-Punkt-Polygon persistiert.' })
  geometryType!: string;

  @ApiProperty({
    description: 'GeoJSON-Feature mit Polygon-Geometrie (RFC 7946)',
    type: 'object',
    additionalProperties: true,
  })
  geometry!: Record<string, unknown>;

  @ApiProperty({ description: 'Optionales Panel-Label (max. 200 Zeichen)', required: false, nullable: true })
  bezeichnung!: string | null;

  @ApiProperty({ description: 'Aus der Matrix-Zelle abgeleitete Warnstufe (null = unbewertet)', required: false, nullable: true })
  warnstufe!: string | null;

  @ApiProperty({ description: 'Urheber der ersten Zeichnung' })
  erstelltVon!: string;

  @ApiProperty({ description: 'Letzter bearbeitender User (oder null wenn seit Erstellung unverändert)', required: false, nullable: true })
  aktualisiertVon!: string | null;

  @ApiProperty({ description: 'Erstellungszeitpunkt' })
  erstelltAm!: Date;

  @ApiProperty({ description: 'Letzter Änderungszeitpunkt' })
  aktualisiertAm!: Date;
}

/**
 * Listenresponse für `GET /einsatz/:einsatzId/gefahrenzonen`.
 */
export class GefahrenzoneListResponseDto {
  @ApiProperty({ description: 'Einsatz-ID, zu dem die Zonen gehören' })
  einsatzId!: string;

  @ApiProperty({ type: [GefahrenzoneDto], description: 'Alle Zonen inkl. abgeleiteter Matrix-Warnstufe' })
  zonen!: GefahrenzoneDto[];
}
