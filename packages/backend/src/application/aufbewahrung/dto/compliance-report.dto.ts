import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO fuer Compliance-Reports in API-Responses.
 *
 * Dokumentiert DSGVO-Anonymisierungs- und Loeschvorgaenge.
 *
 * @remarks Story 5.5 AC4
 */
export class ComplianceReportDto {
  @ApiProperty({ description: 'Report-ID' })
  id!: string;

  @ApiProperty({ description: 'Einsatz-ID des betroffenen Einsatzes' })
  einsatzId!: string;

  @ApiProperty({ description: 'Typ des Vorgangs', enum: ['ANONYMISIERUNG', 'LOESCHUNG'] })
  typ!: 'ANONYMISIERUNG' | 'LOESCHUNG';

  @ApiProperty({ description: 'Anzahl betroffener Befehle', example: 5 })
  befehlCount!: number;

  @ApiProperty({ description: 'Anzahl betroffener Empfaenger', example: 12 })
  empfaengerCount!: number;

  @ApiProperty({ description: 'Anzahl betroffener Kommentare', example: 3 })
  kommentarCount!: number;

  @ApiProperty({ description: 'Zeitpunkt der Durchfuehrung' })
  durchgefuehrtAm!: Date;

  @ApiProperty({ description: 'System-User oder Admin der den Vorgang ausgeloest hat', example: 'SYSTEM' })
  durchgefuehrtVon!: string;
}
