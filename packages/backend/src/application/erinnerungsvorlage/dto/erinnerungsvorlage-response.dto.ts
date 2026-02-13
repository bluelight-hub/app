import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für eine Erinnerungsvorlage.
 */
export class ErinnerungsvorlageResponseDto {
  @ApiProperty({ description: 'Eindeutige ID der Vorlage', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Titel der Vorlage', example: 'Lagebesprechung' })
  titel!: string;

  @ApiProperty({ description: 'Zeitdauer in Minuten', example: 30 })
  minuten!: number;

  @ApiProperty({ description: 'Beschreibung der Vorlage', example: 'Regelmäßige Lagebesprechung', nullable: true, type: String })
  beschreibung!: string | null;

  @ApiProperty({ description: 'Erstellt von (User ID)', example: 'clw3h8x9y0001qwertyuiopas' })
  createdBy!: string;

  @ApiProperty({ description: 'Erstellt am (ISO-8601)', example: '2026-01-19T15:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Zuletzt aktualisiert (ISO-8601)', example: '2026-01-19T15:30:00.000Z' })
  updatedAt!: string;
}
