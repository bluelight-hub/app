import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO fuer eine Kategorie.
 */
export class KategorieResponseDto {
  @ApiProperty({ description: 'Eindeutige ID der Kategorie', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Name der Kategorie', example: 'Einsatzleitung' })
  name!: string;

  @ApiProperty({ description: 'Farbe der Kategorie als Hex-Code', example: '#FF5733' })
  farbe!: string;

  @ApiProperty({ description: 'Einsatz ID', example: 'clw3h8x9y0001qwertyuiopas' })
  einsatzId!: string;

  @ApiProperty({ description: 'Erstellt von (User ID)', example: 'clw3h8x9y0002qwertyuiopas' })
  erstelltVon!: string;

  @ApiProperty({ description: 'Name des Erstellers', nullable: true, required: false, type: String })
  erstelltVonName!: string | null;

  @ApiProperty({ description: 'Erstellt am (ISO-8601)', example: '2026-02-03T15:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Zuletzt aktualisiert (ISO-8601)', example: '2026-02-03T15:30:00.000Z' })
  updatedAt!: string;
}
