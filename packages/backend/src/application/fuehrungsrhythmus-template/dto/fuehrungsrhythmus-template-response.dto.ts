import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für einen Eintrag im Führungsrhythmus-Template.
 */
export class FuehrungsrhythmusEintragResponseDto {
  @ApiProperty({ description: 'Eindeutige ID des Eintrags', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Titel der Erinnerung', example: 'Lagebeurteilung' })
  titel!: string;

  @ApiProperty({ description: 'Intervall in Minuten', example: 30 })
  intervallMinuten!: number;

  @ApiProperty({ description: 'Offset in Minuten', example: 0 })
  offsetMinuten!: number;

  @ApiProperty({ description: 'Sortierreihenfolge', example: 0 })
  sortOrder!: number;
}

/**
 * Response DTO für ein Führungsrhythmus-Template.
 */
export class FuehrungsrhythmusTemplateResponseDto {
  @ApiProperty({ description: 'Eindeutige ID', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Name des Templates', example: 'Führungsrhythmus 30min' })
  name!: string;

  @ApiProperty({ description: 'Beschreibung', example: 'Standard-Führungsrhythmus', nullable: true, type: String })
  beschreibung!: string | null;

  @ApiProperty({ description: 'Einträge des Templates', type: [FuehrungsrhythmusEintragResponseDto] })
  eintraege!: FuehrungsrhythmusEintragResponseDto[];

  @ApiProperty({ description: 'Erstellt von (User ID)', example: 'clw3h8x9y0001qwertyuiopas' })
  createdBy!: string;

  @ApiProperty({ description: 'Erstellt am (ISO-8601)', example: '2026-01-19T15:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Zuletzt aktualisiert (ISO-8601)', example: '2026-01-19T15:30:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ description: 'Scope des Templates', example: 'GLOBAL', enum: ['EINSATZ', 'GLOBAL'] })
  scope!: string;

  @ApiProperty({ description: 'Einsatz-ID (nur bei Scope EINSATZ)', nullable: true, type: String, example: null })
  einsatzId!: string | null;
}
