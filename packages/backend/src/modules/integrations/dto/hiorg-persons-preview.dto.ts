/**
 * HiOrgPersonsPreviewDto - Response DTOs für Personen-Vorschau.
 *
 * @module modules/integrations/dto
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Qualifikation einer Person in der Vorschau.
 *
 * Enthält Mapping-Status für das Inline-Mapping beim Import.
 */
export class HiOrgQualifikationPreviewItemDto {
  @ApiProperty({
    description: 'Name der Qualifikation in HiOrg',
    example: 'Rettungssanitäter',
  })
  name!: string;

  @ApiProperty({
    description: 'Kurzname der Qualifikation in HiOrg',
    example: 'RS',
    required: false,
  })
  nameKurz?: string;

  @ApiProperty({
    description: 'Bereits auf lokale Qualifikation gemappt?',
    example: true,
  })
  isMapped!: boolean;

  @ApiProperty({
    description: 'ID der gemappten lokalen Qualifikation (nur bei isMapped=true)',
    example: 'clp1234567890abcdef',
    required: false,
  })
  mappedQualifikationId?: string;

  @ApiProperty({
    description: 'Name der gemappten lokalen Qualifikation (nur bei isMapped=true)',
    example: 'Rettungssanitäter',
    required: false,
  })
  mappedQualifikationName?: string;

  @ApiProperty({
    description: 'Auto-Match Confidence Score (0-100, nur bei Auto-Match)',
    example: 95,
    required: false,
  })
  autoMatchConfidence?: number;

  @ApiProperty({
    description: 'Auto-Match Vorschlag für Qualifikation-ID (falls vorhanden)',
    example: 'clp1234567890abcdef',
    required: false,
  })
  autoMatchSuggestionId?: string;

  @ApiProperty({
    description: 'Auto-Match Vorschlag für Qualifikation-Name (falls vorhanden)',
    example: 'Rettungssanitäter',
    required: false,
  })
  autoMatchSuggestionName?: string;
}

/**
 * Einzelne Person in der Vorschau.
 *
 * WARUM reduzierte Daten:
 * - Vorschau zeigt nur die wichtigsten Felder
 * - Vollständige Daten werden erst beim Import geladen
 * - Performance: Weniger Daten = schnellere Response
 */
export class HiOrgPersonPreviewItemDto {
  @ApiProperty({
    description: 'Benutzername in HiOrg',
    example: 'mmustermann',
  })
  username!: string;

  @ApiProperty({
    description: 'Mitgliedsnummer (falls vorhanden)',
    example: '12345',
    required: false,
  })
  mitgliednr?: string;

  @ApiProperty({
    description: 'Vorname',
    example: 'Max',
  })
  vorname!: string;

  @ApiProperty({
    description: 'Nachname',
    example: 'Mustermann',
  })
  nachname!: string;

  @ApiProperty({
    description: 'Anzahl der Qualifikationen',
    example: 3,
  })
  qualifikationenCount!: number;

  @ApiProperty({
    description: 'Qualifikationen mit Mapping-Status',
    type: [HiOrgQualifikationPreviewItemDto],
  })
  qualifikationen!: HiOrgQualifikationPreviewItemDto[];

  @ApiProperty({
    description: 'Anzahl der Ausbildungen',
    example: 2,
  })
  ausbildungenCount!: number;

  @ApiProperty({
    description: 'Bereits als StammPerson importiert?',
    example: false,
  })
  isDuplicate!: boolean;

  @ApiProperty({
    description: 'ID der existierenden StammPerson (nur bei isDuplicate=true)',
    example: 'clp1234567890abcdef',
    required: false,
  })
  existingStammPersonId?: string;
}

/**
 * Response DTO für Personen-Vorschau.
 */
export class HiOrgPersonsPreviewResponseDto {
  @ApiProperty({
    description: 'Gesamtzahl der gefundenen Personen',
    example: 42,
  })
  totalCount!: number;

  @ApiProperty({
    description: 'Liste der Personen',
    type: [HiOrgPersonPreviewItemDto],
  })
  persons!: HiOrgPersonPreviewItemDto[];
}
