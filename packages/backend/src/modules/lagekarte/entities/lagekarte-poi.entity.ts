import { type LagekartePoi as PrismaLagekartePoi, PoiType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Lagekarte POI Entity
 *
 * Repräsentiert einen Point of Interest (POI) auf einer Lagekarte.
 * POIs werden entweder durch Geocoding (Adresse → Koordinaten) oder
 * durch manuelle Platzierung auf der Karte erstellt.
 */
export class LagekartePoi implements PrismaLagekartePoi {
  @ApiProperty({
    description: 'Eindeutige ID des POI',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id: string;

  @ApiProperty({
    description: 'Referenz zur zugehörigen Lagekarte',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  lagekarteId: string;

  @ApiProperty({
    enum: PoiType,
    description: 'Typ des POI (z.B. EINSATZORT, FAHRZEUG, GEFAHRENQUELLE)',
    example: 'EINSATZORT',
  })
  type: PoiType;

  @ApiProperty({
    description: 'Name/Bezeichnung des POI',
    example: 'Haupteinsatzstelle',
    required: false,
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Adresse des POI (für Geocoding)',
    example: 'Hauptstraße 1, 10115 Berlin',
    required: false,
    nullable: true,
  })
  adresse: string | null;

  @ApiProperty({
    description: 'Geografische Breite (Latitude)',
    example: 52.52,
  })
  latitude: number;

  @ApiProperty({
    description: 'Geografische Länge (Longitude)',
    example: 13.405,
  })
  longitude: number;

  @ApiProperty({
    description: 'Icon-Identifier für Kartendarstellung',
    example: 'fire-station',
    required: false,
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: 'Zusätzliche Metadaten (JSONB)',
    example: { color: 'red', size: 'large' },
    required: false,
    nullable: true,
  })
  metadata: object | null;

  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2025-10-15T15:24:48.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Letzter Änderungszeitpunkt',
    example: '2025-10-15T16:30:00.000Z',
  })
  updatedAt: Date;
}
