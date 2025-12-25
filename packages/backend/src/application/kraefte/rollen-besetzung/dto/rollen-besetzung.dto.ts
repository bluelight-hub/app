import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für RollenBesetzung.
 *
 * **Snapshot-Semantik (AC3):**
 * - rollenName, personVorname, personNachname sind KOPIEN zum Besetzungszeitpunkt
 * - Änderungen an RollenDefinition oder EinsatzPerson beeinflussen diese Daten NICHT
 * - Ermöglicht korrekte ETB-Einträge auch bei nachträglichen Änderungen
 */
export class RollenBesetzungDto {
  @ApiProperty({
    description: 'RollenBesetzung ID (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({
    description: 'Einsatz ID (CUID2)',
    example: 'clw4i9jkl8m9n0opq1rs',
  })
  einsatzId!: string;

  @ApiProperty({
    description: 'EinsatzPerson ID der zugewiesenen Person (CUID2)',
    example: 'clw5j0klm9n0o1pqr2st',
  })
  einsatzPersonId!: string;

  @ApiProperty({
    description: 'RollenDefinition ID der besetzten Rolle (CUID2)',
    example: 'clw6k1lmn0o1p2qrs3tu',
  })
  rollenDefinitionId!: string;

  @ApiProperty({
    description: 'Rollenname (Snapshot zum Besetzungszeitpunkt)',
    example: 'Organisatorischer Leiter (OrgL)',
  })
  rollenName!: string;

  @ApiProperty({
    description: 'Vorname der Person (Snapshot zum Besetzungszeitpunkt)',
    example: 'Max',
  })
  personVorname!: string;

  @ApiProperty({
    description: 'Nachname der Person (Snapshot zum Besetzungszeitpunkt)',
    example: 'Mustermann',
  })
  personNachname!: string;

  @ApiProperty({
    description: 'Besetzt am (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Besetzt von (User ID, CUID2)',
    example: 'clw7l2mno1p2q3rst4uv',
  })
  createdBy!: string;
}

/**
 * Vereinfachtes DTO für Listen-Ansichten.
 */
export class RollenBesetzungListItemDto {
  @ApiProperty({
    description: 'RollenBesetzung ID (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({
    description: 'Rollenname',
    example: 'Organisatorischer Leiter (OrgL)',
  })
  rollenName!: string;

  @ApiProperty({
    description: 'Vollständiger Name der Person',
    example: 'Max Mustermann',
  })
  personName!: string;

  @ApiProperty({
    description: 'RollenDefinition ID',
    example: 'clw6k1lmn0o1p2qrs3tu',
  })
  rollenDefinitionId!: string;

  @ApiProperty({
    description: 'EinsatzPerson ID',
    example: 'clw5j0klm9n0o1pqr2st',
  })
  einsatzPersonId!: string;
}
