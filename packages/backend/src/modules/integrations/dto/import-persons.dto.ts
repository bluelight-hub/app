/**
 * DTOs für HiOrg-Server Personen-Import.
 *
 * Story 7.2: Import-Auswahl & Qualifikations-Mapping
 *
 * @module modules/integrations/dto
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';

/**
 * DTO für Import-Request.
 */
export class ImportPersonsRequestDto {
  @ApiProperty({
    description: 'Array von HiOrg Usernames der zu importierenden Personen',
    example: ['max.mustermann', 'erika.musterfrau'],
    type: [String],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Mindestens eine Person muss ausgewählt werden' })
  @ArrayMaxSize(100, { message: 'Maximal 100 Personen können gleichzeitig importiert werden' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  usernames!: string[];

  @ApiPropertyOptional({
    description: 'Strategie bei bereits existierenden Personen',
    enum: ['skip', 'update'],
    default: 'skip',
    example: 'skip',
  })
  @IsOptional()
  @IsEnum(['skip', 'update'])
  duplicateStrategy?: 'skip' | 'update';
}

/**
 * DTO für einzelnes Import-Ergebnis.
 */
export class ImportPersonResultItemDto {
  @ApiProperty({ description: 'HiOrg Username', example: 'max.mustermann' })
  username!: string;

  @ApiProperty({ description: 'Vorname', example: 'Max' })
  vorname!: string;

  @ApiProperty({ description: 'Nachname', example: 'Mustermann' })
  nachname!: string;

  @ApiProperty({
    description: 'Import-Status',
    enum: ['created', 'updated', 'skipped', 'failed'],
    example: 'created',
  })
  status!: 'created' | 'updated' | 'skipped' | 'failed';

  @ApiPropertyOptional({
    description: 'Fehlergrund (nur bei status="failed")',
    example: 'Personalnummer existiert bereits',
  })
  error?: string;

  @ApiPropertyOptional({
    description: 'ID der erstellten/aktualisierten StammPerson',
    example: 'clp1234567890abcdef',
  })
  stammPersonId?: string;

  @ApiProperty({
    description: 'Anzahl erfolgreich gemappter Qualifikationen',
    example: 3,
  })
  qualifikationenMapped!: number;

  @ApiProperty({
    description: 'Anzahl nicht gemappter Qualifikationen (Warnung)',
    example: 1,
  })
  qualifikationenUnmapped!: number;
}

/**
 * DTO für Import-Response.
 */
export class ImportPersonsResponseDto {
  @ApiProperty({
    description: 'Gesamtzahl verarbeiteter Personen',
    example: 5,
  })
  totalProcessed!: number;

  @ApiProperty({
    description: 'Anzahl neu erstellter Personen',
    example: 3,
  })
  created!: number;

  @ApiProperty({
    description: 'Anzahl aktualisierter Personen',
    example: 1,
  })
  updated!: number;

  @ApiProperty({
    description: 'Anzahl übersprungener Personen (Duplikate)',
    example: 1,
  })
  skipped!: number;

  @ApiProperty({
    description: 'Anzahl fehlgeschlagener Imports',
    example: 0,
  })
  failed!: number;

  @ApiProperty({
    description: 'Detaillierte Ergebnisse pro Person',
    type: [ImportPersonResultItemDto],
  })
  results!: ImportPersonResultItemDto[];
}
