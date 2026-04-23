import { ApiProperty } from '@nestjs/swagger';
import { GefaehrdungItemDto } from './gefaehrdung-item.dto';

/**
 * Response-DTO für eine Gefährdungsbeurteilungs-Vorlage (Seed-Szenario). Wird
 * von `GET …/gefaehrdungsbeurteilungs-vorlagen` zurückgegeben.
 */
export class GefaehrdungsbeurteilungVorlageDto {
  @ApiProperty({ description: 'CUID der Vorlage' })
  id!: string;

  @ApiProperty({ description: 'Stabiler Slug, z. B. "manv" oder "cbrn-patientenversorgung"' })
  slug!: string;

  @ApiProperty({ description: 'Lesbarer Name, z. B. "MANV"' })
  name!: string;

  @ApiProperty({ description: 'Szenario-Bezeichnung (UI-Gruppierung)' })
  szenario!: string;

  @ApiProperty({ description: 'Vorgegebene Gefährdungs-Items', type: () => GefaehrdungItemDto, isArray: true })
  items!: GefaehrdungItemDto[];

  @ApiProperty({ description: 'Vorlagen-Version' })
  version!: number;

  @ApiProperty({ description: 'Aktiv-Status — nur aktive Vorlagen werden geliefert' })
  aktiv!: boolean;

  @ApiProperty({ description: 'Erstellungszeitpunkt (ISO 8601)' })
  erstelltAm!: string;
}
