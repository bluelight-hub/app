import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NinaWarnungDetailDto {
  @ApiProperty({ description: 'Warnungs-ID' })
  id!: string;

  @ApiPropertyOptional({ description: 'Warnungs-Typ / Ereignis', example: 'Hochwasser' })
  event?: string;

  @ApiProperty({ description: 'Schweregrad', example: 'Severe' })
  severity!: string;

  @ApiPropertyOptional({ description: 'Überschrift der Warnung' })
  headline?: string;

  @ApiPropertyOptional({ description: 'Beschreibungstext' })
  description?: string;

  @ApiPropertyOptional({ description: 'Handlungsempfehlung' })
  instruction?: string;

  @ApiPropertyOptional({ description: 'Herausgeber der Warnung' })
  senderName?: string;

  @ApiPropertyOptional({ description: 'Sender-ID' })
  sender?: string;

  @ApiPropertyOptional({ description: 'Gesendet am (ISO-8601)' })
  sent?: string;

  @ApiPropertyOptional({ description: 'Gültig ab (ISO-8601)' })
  effective?: string;

  @ApiPropertyOptional({ description: 'Gültig bis (ISO-8601)' })
  expires?: string;

  @ApiPropertyOptional({ description: 'Dringlichkeit' })
  urgency?: string;

  @ApiPropertyOptional({ description: 'Sicherheit/Gewissheit' })
  certainty?: string;

  @ApiPropertyOptional({ description: 'Betroffene Gebiete', type: [String] })
  areas?: string[];

  @ApiPropertyOptional({ description: 'Meldungstyp (Alert, Update, Cancel)', example: 'Alert' })
  msgType?: string;

  @ApiPropertyOptional({ description: 'Web-Link für weitere Informationen' })
  web?: string;
}
