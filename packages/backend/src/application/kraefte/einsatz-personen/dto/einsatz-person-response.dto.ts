import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO für EinsatzPerson.
 *
 * Enthält alle Felder einer registrierten Person im Einsatz.
 *
 * **Snapshot-Semantik:**
 * - vorname, nachname, funkrufname sind KOPIEN zum Erfassungszeitpunkt
 * - stammId referenziert die Original-StammPerson (falls vorhanden)
 * - Änderungen an StammPerson beeinflussen diese Daten NICHT
 *
 * **Zwei Typen:**
 * - Mit stammId: Aus Stammdaten erfasst (AC1)
 * - Ohne stammId: Manuell erfasst (AC2)
 */
export class EinsatzPersonResponseDto {
  @ApiProperty({
    description: 'EinsatzPerson ID (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({
    description: 'Einsatz ID (UUID) zu dem die Person gehört',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  einsatzId!: string;

  @ApiPropertyOptional({
    description: 'StammPerson ID (CUID2) falls aus Stammdaten erfasst',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  stammId?: string;

  @ApiProperty({
    description: 'Vorname (KOPIE zum Erfassungszeitpunkt)',
    example: 'Max',
  })
  vorname!: string;

  @ApiProperty({
    description: 'Nachname (KOPIE zum Erfassungszeitpunkt)',
    example: 'Mustermann',
  })
  nachname!: string;

  @ApiProperty({
    description: 'Funktion im Einsatz',
    example: 'Rettungshelfer',
  })
  funktion!: string;

  @ApiPropertyOptional({
    description: 'Funkrufname (KOPIE zum Erfassungszeitpunkt)',
    example: 'Florian Heidelberg 1',
  })
  funkrufname?: string;

  @ApiProperty({
    description: 'Qualifikation IDs (Snapshot zum Erfassungszeitpunkt)',
    type: [String],
    example: ['clw3h8ijk7l8m9nop0qr', 'clw4i9jkl8m9n0opq1rs'],
  })
  qualifikationIds!: string[];

  @ApiProperty({
    description: 'Registriert am (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Letzte Aktualisierung (ISO 8601)',
    example: '2024-01-15T11:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({
    description: 'Registriert von (User ID, CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  createdBy!: string;

  @ApiPropertyOptional({
    description: 'Zuletzt aktualisiert von (User ID, CUID2)',
    example: 'clw4i9jkl8m9n0opq1rs',
  })
  updatedBy?: string;
}

/**
 * Vereinfachtes DTO für Listen-Ansichten.
 *
 * Enthält nur die wichtigsten Felder für Übersichtstabellen.
 */
export class EinsatzPersonListItemDto {
  @ApiProperty({
    description: 'EinsatzPerson ID (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({
    description: 'Vollständiger Name (vorname + nachname)',
    example: 'Max Mustermann',
  })
  name!: string;

  @ApiProperty({
    description: 'Funktion im Einsatz',
    example: 'Rettungshelfer',
  })
  funktion!: string;

  @ApiPropertyOptional({
    description: 'Funkrufname',
    example: 'Florian Heidelberg 1',
  })
  funkrufname?: string;

  @ApiPropertyOptional({
    description: 'Stamm-Person-ID falls aus Stammdaten',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  stammId?: string;
}
