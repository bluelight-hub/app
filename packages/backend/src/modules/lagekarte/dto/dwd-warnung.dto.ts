/**
 * DTO für DWD-Wetterwarnungen
 *
 * Wird vom WarnungenController für die API-Response verwendet.
 * Bildet die normalisierten DWD WMS GetFeatureInfo-Daten ab.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DwdWarnungDto {
  @ApiProperty({ description: 'Warnungs-Typ (z.B. "STARKREGEN", "GEWITTER")', example: 'STARKREGEN' })
  event!: string;

  @ApiProperty({ description: 'Warnstufe (Minor, Moderate, Severe, Extreme)', example: 'Moderate' })
  severity!: string;

  @ApiPropertyOptional({ description: 'Beschreibungstext der Warnung' })
  description?: string;

  @ApiPropertyOptional({ description: 'Handlungsempfehlung' })
  instruction?: string;

  @ApiPropertyOptional({ description: 'Beginn der Warnung (ISO-8601)', example: '2026-04-06T14:00:00Z' })
  onset?: string;

  @ApiPropertyOptional({ description: 'Ende der Warnung (ISO-8601)', example: '2026-04-06T20:00:00Z' })
  expires?: string;

  @ApiPropertyOptional({ description: 'Betroffenes Gebiet', example: 'Kreis Ahrweiler' })
  areaDesc?: string;

  @ApiPropertyOptional({ description: 'Überschrift der Warnung' })
  headline?: string;
}
