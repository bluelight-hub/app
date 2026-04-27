import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-Element für `GET /sicherheitsregeln/:id/quittungen` (Story 2.7 AC10).
 *
 * Wird vom Sender-View (Sicherheitsbeauftragter, Stab-Dashboard) genutzt:
 * Zeile pro quittierender Einheit, ohne weitere Frontend-Joins.
 *
 * `quittiertVonUserName` ist optional (Phase-2-Enrichment) — fehlt es,
 * rendert das Frontend einen Fallback aus der `quittiertVonUserId`.
 */
export class SicherheitsregelQuittungDto {
  @ApiProperty({ description: 'cuid2 der Einheit, die quittiert hat.', example: 'clw3h8x9y0000qwertyui00050' })
  einheitId!: string;

  @ApiProperty({ description: 'Anzeigename der Einheit zum Quittungs-Zeitpunkt.', example: '1. Sanitätsgruppe' })
  einheitName!: string;

  @ApiProperty({ description: 'ISO-DateTime, wann die Einheit quittiert hat.', example: '2026-04-27T08:42:13.000Z' })
  quittiertAm!: string;

  @ApiProperty({ description: 'cuid2 des Users, der für die Einheit quittiert hat.', example: 'clw3h8x9y0000qwertyui00099' })
  quittiertVonUserId!: string;

  @ApiProperty({ description: 'Anzeigename des quittierenden Users (optional).', required: false, example: 'Sanitäter Max Müller' })
  quittiertVonUserName?: string;
}
