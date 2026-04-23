import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import {
  EINTRITTSWAHRSCHEINLICHKEIT_WERTE,
  GEFAEHRDUNG_ITEM_LIMITS,
  SCHADENSAUSMASS_WERTE,
  type Eintrittswahrscheinlichkeit,
  type Schadensausmass,
} from '@domain/eigenschutz/value-objects/gefaehrdung-item.vo';

/**
 * Request-DTO für ein einzelnes Gefährdungs-Item im Update-Payload.
 *
 * Bewusst **ohne** `risikoklasse`-Feld: der Server berechnet die Klasse
 * autoritativ aus `(eintritt, schaden)` nach der Matrix aus ADR-013. Ein
 * Client-mitgeliefertes Feld würde ignoriert — deshalb gehört es auch
 * nicht in den API-Contract (Story 2.2 AC4).
 *
 * Validierung klassenbasiert (class-validator), konsistent mit Story 2.1.
 * Die semantischen Grenzen stammen aus `GEFAEHRDUNG_ITEM_LIMITS` bzw. den
 * Enum-Konstanten im VO — identisch zum Shared-Zod-Schema.
 */
export class GefaehrdungItemInputDto {
  @ApiPropertyOptional({ description: 'Item-ID (optional — neue Items tragen keine ID)', example: 'clw3h8x9y0000qwertyuiaaaaa' })
  @IsOptional()
  @IsString({ message: 'id muss ein Text sein' })
  @Matches(/^[a-z0-9]{20,32}$/, { message: 'id hat kein gültiges CUID-Format' })
  id?: string;

  @ApiProperty({ description: 'Titel der Gefährdung', maxLength: GEFAEHRDUNG_ITEM_LIMITS.titleMax, minLength: GEFAEHRDUNG_ITEM_LIMITS.titleMin })
  @IsString({ message: 'title muss ein Text sein' })
  @MinLength(GEFAEHRDUNG_ITEM_LIMITS.titleMin, { message: 'title ist erforderlich' })
  @MaxLength(GEFAEHRDUNG_ITEM_LIMITS.titleMax, { message: `title darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.titleMax} Zeichen haben` })
  title!: string;

  @ApiPropertyOptional({ description: 'Beschreibung der Gefährdung', maxLength: GEFAEHRDUNG_ITEM_LIMITS.descriptionMax })
  @IsOptional()
  @IsString({ message: 'description muss ein Text sein' })
  @MaxLength(GEFAEHRDUNG_ITEM_LIMITS.descriptionMax, { message: `description darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.descriptionMax} Zeichen haben` })
  description?: string;

  @ApiPropertyOptional({ description: 'Eintrittswahrscheinlichkeit', enum: EINTRITTSWAHRSCHEINLICHKEIT_WERTE })
  @IsOptional()
  @IsEnum(EINTRITTSWAHRSCHEINLICHKEIT_WERTE, { message: 'eintritt muss eine gültige Eintrittswahrscheinlichkeit sein' })
  eintritt?: Eintrittswahrscheinlichkeit;

  @ApiPropertyOptional({ description: 'Schadensausmaß', enum: SCHADENSAUSMASS_WERTE })
  @IsOptional()
  @IsEnum(SCHADENSAUSMASS_WERTE, { message: 'schaden muss ein gültiges Schadensausmaß sein' })
  schaden?: Schadensausmass;

  @ApiPropertyOptional({ description: 'Schutzmaßnahmen-Freitext', maxLength: GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax })
  @IsOptional()
  @IsString({ message: 'schutzmassnahmen muss ein Text sein' })
  @MaxLength(GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax, { message: `schutzmassnahmen darf maximal ${GEFAEHRDUNG_ITEM_LIMITS.schutzmassnahmenMax} Zeichen haben` })
  schutzmassnahmen?: string;
}

/** Utility für class-validator Nested-Objects — wird in Validation-Pipe benötigt (used via `@Type`). */
export type GefaehrdungItemInputDtoProps = {
  id?: string;
  title: string;
  description?: string;
  eintritt?: Eintrittswahrscheinlichkeit;
  schaden?: Schadensausmass;
  schutzmassnahmen?: string;
};

/**
 * Top-level Request-DTO für `POST …/gefaehrdungsbeurteilungen/:id/items`.
 *
 * Enthält das Items-Array und das Optimistic-Concurrency-Token. Beide Felder
 * sind Pflicht.
 */
export class UpdateGefaehrdungsbeurteilungItemsDto {
  @ApiProperty({
    description: 'Neue Items-Liste (ersetzt den Bestand vollständig). Leeres Array entfernt alle Items.',
    type: GefaehrdungItemInputDto,
    isArray: true,
  })
  @IsArray({ message: 'items muss ein Array sein' })
  // Bound: 100 Items × ~4 KB (titleMax + descriptionMax + schutzmassnahmenMax)
  // ≈ 400 KB maximaler Request-Body. 500 wäre ~2 MB und öffnet ein DoS-
  // Fenster; realistische Gefährdungsbeurteilungen haben <30 Items.
  @ArrayMaxSize(100, { message: 'items darf maximal 100 Einträge enthalten' })
  @ValidateNested({ each: true })
  @Type(() => GefaehrdungItemInputDto)
  items!: GefaehrdungItemInputDto[];

  @ApiProperty({ description: 'Erwartete Aggregate-Version (Optimistic-Concurrency-Token)', example: 1, minimum: 1 })
  @IsInt({ message: 'expectedVersion muss eine ganze Zahl sein' })
  @Min(1, { message: 'expectedVersion muss mindestens 1 sein' })
  expectedVersion!: number;
}
