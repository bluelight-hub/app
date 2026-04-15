import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKanalDetailsExtraModels, KANAL_DETAILS_SCHEMA, type KanalDetailsUnionDto } from './kanal-details.dto';
import { ZuordnungResponseDto } from './zuordnung.dto';

export const FUNKKANAL_STATUS_VALUES = ['aktiv', 'inaktiv', 'archiviert'] as const;
export type FunkkanalStatusValue = (typeof FUNKKANAL_STATUS_VALUES)[number];

/**
 * Response-DTO für einen einzelnen Funkkanal inkl. Zuordnungen.
 *
 * Verwendet die diskriminierte `details`-Union — die Swagger-Extra-Models
 * müssen am Controller über {@link ApiKanalDetailsExtraModels} registriert sein,
 * damit die Referenzen im generierten Client korrekt aufgelöst werden.
 */
export class FunkkanalResponseDto {
  @ApiProperty({ example: 'clkanal...', description: 'Funkkanal-ID' })
  id!: string;

  @ApiProperty({ example: 'cleinsatz...', description: 'Zugehörige Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ example: 'Führung 1', description: 'Kanalname' })
  name!: string;

  @ApiProperty({
    ...KANAL_DETAILS_SCHEMA,
    description: 'Kanaltyp-spezifische Details (discriminated union)',
  })
  details!: KanalDetailsUnionDto;

  @ApiProperty({ enum: FUNKKANAL_STATUS_VALUES, example: 'aktiv' })
  status!: FunkkanalStatusValue;

  @ApiPropertyOptional({ example: 'Einsatzabschnittsleiter', description: 'Optionaler Zweck', nullable: true })
  zweck?: string | null;

  @ApiProperty({ example: 0, description: 'Sortierungs-Index (asc)' })
  sortIndex!: number;

  @ApiProperty({ type: () => [ZuordnungResponseDto], description: 'Kraft-Zuordnungen dieses Kanals' })
  zuordnungen!: ZuordnungResponseDto[];

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-04-14T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: 'string', format: 'date-time', example: '2026-04-14T12:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'User-ID des Erstellers', nullable: true })
  createdBy?: string | null;

  @ApiPropertyOptional({ description: 'User-ID des letzten Editors', nullable: true })
  updatedBy?: string | null;
}
