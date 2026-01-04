/**
 * DTOs für Qualifikation-Mapping API.
 *
 * Story 7.2: HiOrg-Server Import - Qualifikations-Mapping
 *
 * @module modules/integrations/dto
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import type { AutoMatchType } from '@domain/integrations';

/**
 * DTO für ein einzelnes Qualifikation-Mapping.
 */
export class QualifikationMappingItemDto {
  @ApiProperty({ description: 'Mapping ID' })
  id!: string;

  @ApiProperty({ description: 'Externer Qualifikations-Name (z.B. aus HiOrg)' })
  externalName!: string;

  @ApiProperty({ description: 'Externe Quelle', example: 'HIORG_SERVER' })
  externalSource!: string;

  @ApiPropertyOptional({ description: 'Gemappte Qualifikation-ID (null = ungemappt)' })
  qualifikationId!: string | null;

  @ApiPropertyOptional({ description: 'Name der gemappten Qualifikation' })
  qualifikationName!: string | null;

  @ApiProperty({ description: 'Wurde automatisch gematcht?' })
  isAutoMatched!: boolean;

  @ApiPropertyOptional({ description: 'Konfidenz-Score (0-100, nur bei Auto-Match)' })
  confidence!: number | null;

  @ApiProperty({ description: 'Erstellungsdatum' })
  createdAt!: Date;

  @ApiProperty({ description: 'Änderungsdatum' })
  updatedAt!: Date;
}

/**
 * Response DTO für Qualifikation-Mappings Liste.
 */
export class QualifikationMappingsResponseDto {
  @ApiProperty({ type: [QualifikationMappingItemDto], description: 'Liste der Mappings' })
  mappings!: QualifikationMappingItemDto[];

  @ApiProperty({ description: 'Gesamtanzahl Mappings' })
  total!: number;

  @ApiProperty({ description: 'Anzahl gemappter Einträge' })
  mapped!: number;

  @ApiProperty({ description: 'Anzahl ungemappter Einträge' })
  unmapped!: number;
}

/**
 * Request DTO für Speichern eines Mappings.
 */
export class SaveQualifikationMappingRequestDto {
  @ApiProperty({ description: 'Mapping ID' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'Qualifikation-ID zum Mappen (null = Mapping entfernen)' })
  @IsOptional()
  @IsString()
  qualifikationId?: string | null;
}

/**
 * Response DTO für Auto-Match Ergebnis.
 */
export class AutoMatchResultItemDto {
  @ApiProperty({ description: 'Externer Qualifikations-Name' })
  externalName!: string;

  @ApiPropertyOptional({ description: 'Gematchte Qualifikation-ID (null = kein Match)' })
  matchedQualifikationId!: string | null;

  @ApiPropertyOptional({ description: 'Name der gematchten Qualifikation' })
  matchedQualifikationName!: string | null;

  @ApiProperty({ description: 'Konfidenz-Score (0-100)' })
  confidence!: number;

  @ApiProperty({ description: 'Match-Typ', enum: ['EXACT', 'SHORT_NAME', 'FUZZY', 'NONE'] })
  matchType!: AutoMatchType;
}

/**
 * Response DTO für Auto-Match Ergebnis.
 */
export class AutoMatchResultResponseDto {
  @ApiProperty({ type: [AutoMatchResultItemDto], description: 'Match-Ergebnisse' })
  matches!: AutoMatchResultItemDto[];

  @ApiProperty({ description: 'Anzahl erfolgreicher Matches' })
  totalMatched!: number;

  @ApiProperty({ description: 'Anzahl ohne Match' })
  totalUnmatched!: number;

  @ApiProperty({ description: 'Durchschnittliche Konfidenz der Matches' })
  averageConfidence!: number;
}

/**
 * Request DTO für Auto-Match.
 */
export class AutoMatchRequestDto {
  @ApiPropertyOptional({ description: 'Nur ungemappte Einträge matchen?', default: true })
  @IsOptional()
  @IsBoolean()
  onlyUnmapped?: boolean;
}

/**
 * Einzelnes Mapping-Item für Batch-Save.
 */
export class BatchSaveMappingItemDto {
  @ApiProperty({ description: 'Externer Qualifikations-Name (z.B. aus HiOrg)' })
  @IsString()
  externalName!: string;

  @ApiPropertyOptional({ description: 'Qualifikation-ID zum Mappen (null = ignorieren)' })
  @IsOptional()
  @IsString()
  qualifikationId?: string | null;

  @ApiPropertyOptional({ description: 'Explizit als ignoriert markieren?', default: false })
  @IsOptional()
  @IsBoolean()
  isIgnored?: boolean;
}

/**
 * Request DTO für Batch-Save von Mappings.
 *
 * Ermöglicht das Speichern mehrerer Mappings in einer Transaktion.
 * Wird beim Inline-Mapping im Import-Dialog verwendet.
 */
export class BatchSaveQualifikationMappingsRequestDto {
  @ApiProperty({
    type: [BatchSaveMappingItemDto],
    description: 'Liste der zu speichernden Mappings (1-100)',
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchSaveMappingItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  mappings!: BatchSaveMappingItemDto[];
}

/**
 * Response DTO für Batch-Save von Mappings.
 */
export class BatchSaveQualifikationMappingsResponseDto {
  @ApiProperty({ description: 'Anzahl gespeicherter Mappings' })
  saved!: number;

  @ApiProperty({ description: 'Anzahl ignorierter Mappings (qualifikationId=null)' })
  ignored!: number;
}
