import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const AMPEL_WARN_BADGE_TYPES = ['GEFAEHRDUNG_OHNE_SCHUTZMASSNAHME', 'PSA_QUITTUNG_UEBERFAELLIG'] as const;
export type AmpelWarnBadgeDtoType = (typeof AMPEL_WARN_BADGE_TYPES)[number];

export class AmpelWarnBadgeDto {
  @ApiProperty({ description: 'Stabile, deterministische Badge-ID' })
  id!: string;

  @ApiProperty({ description: 'CUID des Einsatzes' })
  einsatzId!: string;

  @ApiProperty({ description: 'CUID der Einsatzeinheit' })
  einheitId!: string;

  @ApiProperty({ description: 'Typ der Warn-Markierung', enum: AMPEL_WARN_BADGE_TYPES })
  type!: AmpelWarnBadgeDtoType;

  @ApiProperty({ description: 'Kurzer UI-Text der Warn-Markierung' })
  label!: string;

  @ApiProperty({ description: 'Sortierrang für stabile Priorisierung' })
  sortRank!: number;

  @ApiProperty({ description: 'Zeitpunkt der auslösenden oder letzten relevanten Änderung (ISO 8601)', type: String, format: 'date-time' })
  occurredAt!: string;

  @ApiPropertyOptional({ description: 'Gefährdungsbeurteilung für Gefährdungs-Badges', nullable: true, type: String })
  gefaehrdungsbeurteilungId?: string | null;

  @ApiPropertyOptional({ description: 'Konkretes Gefährdungs-Item für Fokus-Navigation', nullable: true, type: String })
  gefaehrdungItemId?: string | null;

  @ApiPropertyOptional({ description: 'Titel der Gefährdung', nullable: true, type: String })
  gefaehrdungTitel?: string | null;

  @ApiPropertyOptional({ description: 'PSA-Bekanntgabe-Gruppe für Überfälligkeits-Badges', nullable: true, type: String })
  propagationGroupId?: string | null;

  @ApiPropertyOptional({ description: 'Überfälligkeit in ganzen Minuten', nullable: true, type: Number })
  ueberfaelligSeitMin?: number | null;
}
