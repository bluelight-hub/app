import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GefaehrdungItemDto } from './gefaehrdung-item.dto';

/**
 * Response-DTO für eine einzelne Version in der Historie-Timeline
 * (Story 2.4, GET `…/gefaehrdungsbeurteilungen/:id/versionen`).
 *
 * Die aktuelle (offene) Version trägt `gueltigBis === null`. Die Chain-
 * Semantik `V_n.gueltigBis === V_{n+1}.gueltigVon` ist halb-offen
 * (`[gueltigVon, gueltigBis)`) — siehe JSDoc am Repository-Port.
 */
export class GefaehrdungsbeurteilungHistorieEintragDto {
  @ApiProperty({ description: 'Versionsnummer (monoton steigend)' })
  version!: number;

  @ApiProperty({ description: 'ISO-8601 Zeitpunkt, ab dem die Version gültig war' })
  gueltigVon!: string;

  @ApiPropertyOptional({
    description: 'ISO-8601 Zeitpunkt, bis zu dem die Version gültig war (`null` = aktuell). Halb-offenes Intervall `[gueltigVon, gueltigBis)`.',
    nullable: true,
  })
  gueltigBis!: string | null;

  @ApiProperty({ description: 'User-ID des Bearbeiters' })
  changedByUserId!: string;

  @ApiPropertyOptional({
    description: 'Aufgelöster Anzeige-Name des Bearbeiters (`null`, wenn der User soft-deleted/gelockt oder nicht auflösbar ist).',
    nullable: true,
  })
  changedByUserName!: string | null;

  @ApiProperty({
    description: 'Geänderte Felder. Shape analog Story 2.3 — V1: `{ created: true }`; Vn (n ≥ 2): `{ added, removed, updated, unchanged }`.',
    type: 'object',
    additionalProperties: true,
  })
  changedFields!: Record<string, unknown>;

  @ApiProperty({
    description: 'Vollständige Items-Liste dieser Version.',
    type: () => GefaehrdungItemDto,
    isArray: true,
  })
  items!: GefaehrdungItemDto[];
}
