import { ApiProperty } from '@nestjs/swagger';
import { GefaehrdungsbeurteilungHistorieEintragDto } from './gefaehrdungsbeurteilung-historie-eintrag.dto';

/**
 * Response-DTO für die vollständige Versions-Historie einer Gefährdungs-
 * beurteilung (Story 2.4).
 *
 * - `aggregateVersion`: aktuelle Aggregate-Version, wird im Frontend für die
 *   „V N von M"-Anzeige und die Erkennung der aktuellen Version genutzt.
 * - `eintraege`: chronologisch absteigend sortiert (neueste Version zuerst).
 */
export class GefaehrdungsbeurteilungHistorieDto {
  @ApiProperty({ description: 'Aktuelle Aggregate-Version (für UI-Indikator "V N von M").' })
  aggregateVersion!: number;

  @ApiProperty({
    description: 'Alle Versionen der Beurteilung, absteigend sortiert (neueste zuerst).',
    type: () => GefaehrdungsbeurteilungHistorieEintragDto,
    isArray: true,
  })
  eintraege!: GefaehrdungsbeurteilungHistorieEintragDto[];
}
