import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-Item für `GET /einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle`
 * (Story 5.3, AC3). **Bewusst ohne `kontextSnapshot`** — der ist mit ~35 KB
 * pro Zeile zu groß für eine Listen-Antwort und wird nur in der Detail-Page
 * (Story 5.2) geladen.
 */
export class EigenschutzVorfallListItemDto {
  @ApiProperty({ description: 'CUID des Vorfalls', example: 'clw3h8x9y0000qwertyui05101' })
  id!: string;

  @ApiProperty({ description: 'CUID der zugeordneten Einheit', example: 'clw3h8x9y0000qwertyui05002' })
  einheitId!: string;

  @ApiProperty({ description: 'Vorfall-Zeit (ISO-8601 mit Offset)', example: '2026-05-06T10:00:00.000Z' })
  vorfallZeit!: string;

  @ApiProperty({ description: 'Kurzbeschreibung „Was" (1–80 Zeichen)', example: 'Sturz beim Aufbau' })
  was!: string;

  @ApiProperty({ description: 'Markierung „Unfallkasse-relevant"', example: true })
  unfallkasseRelevant!: boolean;

  @ApiProperty({ description: 'Erfass-Zeitpunkt aus dem Server (ISO-8601)', example: '2026-05-06T10:01:00.000Z' })
  erfasstAm!: string;

  @ApiProperty({ description: 'CUID des erfassenden Users', example: 'clw3h8x9y0000qwertyui05003' })
  erfasstVonUserId!: string;
}
