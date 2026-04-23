import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EINTRITTSWAHRSCHEINLICHKEIT_WERTE,
  RISIKOKLASSE_WERTE,
  SCHADENSAUSMASS_WERTE,
  type Eintrittswahrscheinlichkeit,
  type Risikoklasse,
  type Schadensausmass,
} from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';

/**
 * Response-DTO für ein einzelnes Gefährdungs-Item.
 *
 * Wird sowohl als Array-Payload in `GefaehrdungsbeurteilungDto.items` als auch
 * in `GefaehrdungsbeurteilungVorlageDto.items` genutzt.
 */
export class GefaehrdungItemDto {
  @ApiPropertyOptional({ description: 'Item-ID (optional — in Vorlagen nicht immer gesetzt)' })
  id?: string;

  @ApiProperty({ description: 'Titel des Gefährdungs-Items', maxLength: 120 })
  title!: string;

  @ApiPropertyOptional({ description: 'Beschreibung des Items', maxLength: 2000 })
  description?: string;

  @ApiPropertyOptional({ description: 'Eintrittswahrscheinlichkeit', enum: EINTRITTSWAHRSCHEINLICHKEIT_WERTE })
  eintritt?: Eintrittswahrscheinlichkeit;

  @ApiPropertyOptional({ description: 'Schadensausmaß', enum: SCHADENSAUSMASS_WERTE })
  schaden?: Schadensausmass;

  @ApiPropertyOptional({ description: 'Risikoklasse (Ampel)', enum: RISIKOKLASSE_WERTE })
  risikoklasse?: Risikoklasse;

  @ApiPropertyOptional({ description: 'Schutzmaßnahmen-Freitext', maxLength: 2000 })
  schutzmassnahmen?: string;
}
