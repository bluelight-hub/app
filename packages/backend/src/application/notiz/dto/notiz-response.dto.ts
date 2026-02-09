import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO fuer eine Notiz.
 */
export class NotizResponseDto {
  @ApiProperty({ description: 'Eindeutige ID der Notiz', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Einsatz ID', example: 'clw3h8x9y0001qwertyuiopas' })
  einsatzId!: string;

  @ApiProperty({ description: 'Titel der Notiz', example: 'Lagebericht Abschnitt B' })
  titel!: string;

  @ApiProperty({ description: 'Inhalt der Notiz', example: '3 Verletzte, RTW angefordert', nullable: true, type: String })
  inhalt!: string | null;

  @ApiProperty({ description: 'Kategorie der Notiz', example: 'Lage', nullable: true, type: String })
  kategorie!: string | null;

  @ApiProperty({ description: 'Ob die Notiz fuer das Team sichtbar ist', type: Boolean })
  istTeamsichtbar!: boolean;

  @ApiProperty({ description: 'Erstellt von (User ID)', example: 'clw3h8x9y0002qwertyuiopas' })
  erstelltVon!: string;

  @ApiProperty({ description: 'Name des Erstellers', nullable: true, required: false, type: String })
  erstelltVonName!: string | null;

  @ApiProperty({ description: 'Erstellt am (ISO-8601)', example: '2026-02-03T15:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Zuletzt aktualisiert (ISO-8601)', example: '2026-02-03T15:30:00.000Z' })
  updatedAt!: string;

  /**
   * Story 8.2: Kategorie-ID der Notiz.
   * @example "clw3h8x9y0008kategorie123"
   */
  @ApiPropertyOptional({ description: 'Kategorie-ID', nullable: true })
  kategorieId?: string | null;

  /**
   * Story 8.2: Kategorie-Name fuer die Anzeige.
   * @example "Dringend"
   */
  @ApiPropertyOptional({ description: 'Kategorie-Name für Anzeige', nullable: true })
  kategorieName?: string | null;

  /**
   * Story 8.2: Kategorie-Farbe (Hex-Code).
   * @example "#FF5733"
   */
  @ApiPropertyOptional({ description: 'Kategorie-Farbe (Hex-Code)', nullable: true })
  kategorieFarbe?: string | null;
}
