import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GefaehrdungItemDto } from './gefaehrdung-item.dto';

/**
 * Response-DTO für `Gefaehrdungsbeurteilung`-Aggregat. Wird von `POST …`
 * (HTTP 201) und `GET …/gefaehrdungsbeurteilungen/:id` geliefert.
 */
export class GefaehrdungsbeurteilungDto {
  @ApiProperty({ description: 'CUID der Gefährdungsbeurteilung' })
  id!: string;

  @ApiProperty({ description: 'CUID des Einsatzes' })
  einsatzId!: string;

  @ApiProperty({ description: 'CUID der Einsatzeinheit' })
  einheitId!: string;

  @ApiPropertyOptional({ description: 'CUID der Vorlage (`null` bei Leer-Formular)', nullable: true })
  vorlageId!: string | null;

  @ApiPropertyOptional({ description: 'CUID der verknüpften Gefahrenzone (optional)', nullable: true })
  gefahrenzoneId!: string | null;

  @ApiProperty({ description: 'Aktuelle Gefährdungs-Items (JSONB-Snapshot)', type: () => GefaehrdungItemDto, isArray: true })
  items!: GefaehrdungItemDto[];

  @ApiProperty({ description: 'Versionsnummer (monoton steigend)' })
  version!: number;

  @ApiProperty({ description: 'Zeitpunkt der Erstellung (ISO 8601)' })
  erstelltAm!: string;

  @ApiProperty({ description: 'User-ID des Erstellers' })
  erstelltVonUserId!: string;

  @ApiProperty({ description: 'Zeitpunkt der letzten Änderung (ISO 8601)' })
  aktualisiertAm!: string;

  @ApiProperty({ description: 'User-ID des letzten Bearbeiters' })
  aktualisiertVonUserId!: string;
}
