/**
 * DTO für NINA-Warnungen (BBK Warn-App)
 *
 * Bildet die normalisierten Warnungen aus der NINA/BBK API ab.
 * Die Felder sind bewusst ähnlich zum DwdWarnungDto für konsistente Frontend-Darstellung.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NinaWarnungDto {
  @ApiProperty({ description: 'Eindeutige Warnungs-ID', example: 'mow.DEU.BY.R.SE034-20260406-001' })
  id!: string;

  @ApiProperty({ description: 'Warnungs-Typ / Ereignis', example: 'Hochwasser' })
  event!: string;

  @ApiProperty({ description: 'Schweregrad (Minor, Moderate, Severe, Extreme)', example: 'Severe' })
  severity!: string;

  @ApiPropertyOptional({ description: 'Überschrift der Warnung' })
  headline?: string;

  @ApiPropertyOptional({ description: 'Beschreibungstext' })
  description?: string;

  @ApiPropertyOptional({ description: 'Handlungsempfehlung' })
  instruction?: string;

  @ApiPropertyOptional({ description: 'Herausgeber der Warnung', example: 'Landeshochwasserzentrum' })
  sender?: string;

  @ApiPropertyOptional({ description: 'Gesendet am (ISO-8601)' })
  sent?: string;

  @ApiPropertyOptional({ description: 'Beginn der Warnung (ISO-8601)' })
  onset?: string;

  @ApiPropertyOptional({ description: 'Ende der Warnung (ISO-8601)' })
  expires?: string;

  @ApiPropertyOptional({ description: 'Betroffenes Gebiet' })
  areaDesc?: string;
}
