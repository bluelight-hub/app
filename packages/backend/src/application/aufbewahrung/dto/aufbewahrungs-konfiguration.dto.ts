import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO fuer Aufbewahrungskonfiguration in API-Responses.
 *
 * @remarks Story 5.5 AC1
 */
export class AufbewahrungsKonfigurationDto {
  @ApiProperty({ description: 'Aufbewahrungsfrist in Jahren (1-30)', example: 10 })
  aufbewahrungsfristJahre!: number;

  @ApiProperty({ description: 'Freigabeperiode in Tagen nach Anonymisierung (1-365)', example: 30 })
  freigabeperiodeTage!: number;

  @ApiProperty({ description: 'Ob automatische Loeschung per Cronjob aktiv ist', example: false })
  automatischLoeschenAktiv!: boolean;
}
