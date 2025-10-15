import type { Lagekarte as PrismaLagekarte } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Lagekarte Entity
 *
 * Repräsentiert eine Lagekarte für einen Einsatz mit GeoJSON State und POIs.
 * Wird automatisch beim ersten Abruf für einen Einsatz erstellt (Lazy Creation).
 */
export class Lagekarte implements PrismaLagekarte {
  @ApiProperty({
    description: 'Eindeutige ID der Lagekarte',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id: string;

  @ApiProperty({
    description: 'Referenz zum zugehörigen Einsatz (1:1 Relation)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  einsatzId: string;

  @ApiProperty({
    description: 'GeoJSON State für Zeichnungen (Polygone, Linien, etc.)',
    example: { type: 'FeatureCollection', features: [] },
  })
  state: object;

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
