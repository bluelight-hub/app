import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { FahrzeugtypDto } from '@application/kraefte/fahrzeugtypen/dto';

/**
 * DTO für EinsatzFahrzeug in API Responses.
 *
 * Repräsentiert ein Fahrzeug, das einem aktiven Einsatz zugewiesen ist.
 * Enthält eine Kopie (Snapshot) der Stammdaten zum Erfassungszeitpunkt.
 *
 * **Snapshot-Semantik:**
 * - funkrufname, kennzeichen sind KOPIEN vom StammFahrzeug
 * - Änderungen am StammFahrzeug beeinflussen dieses EinsatzFahrzeug NICHT
 * - stammId referenziert das Original für Tracking
 */
export class EinsatzFahrzeugDto {
  @ApiProperty({
    description: 'Eindeutige ID des EinsatzFahrzeugs (CUID2)',
    example: 'cuid2abc123def456ghi',
  })
  id!: string;

  @ApiProperty({
    description: 'Einsatz-ID zu dem dieses Fahrzeug gehört (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  einsatzId!: string;

  @ApiPropertyOptional({
    description: 'Stamm-Fahrzeug-ID falls aus Stammdaten erfasst (CUID2)',
    example: 'cuid2xyz789abc123def',
  })
  stammId?: string;

  @ApiProperty({
    description: 'Fahrzeugtyp-ID (CUID2)',
    example: 'cuid2typ123abc456def',
  })
  fahrzeugtypId!: string;

  @ApiProperty({
    description: 'Funkrufname (Snapshot zum Erfassungszeitpunkt)',
    example: 'Rotkreuz 83/1',
  })
  funkrufname!: string;

  @ApiPropertyOptional({
    description: 'Kennzeichen (Snapshot zum Erfassungszeitpunkt)',
    example: 'HD-DRK 123',
  })
  kennzeichen?: string;

  @ApiProperty({
    description: 'Aktueller FMS-Status (0-9)',
    minimum: 0,
    maximum: 9,
    example: 2,
  })
  fmsStatus!: number;

  @ApiPropertyOptional({
    description: 'Aktuelle GPS-Position',
    example: { lat: 49.4094, lng: 8.6944 },
  })
  position?: { lat: number; lng: number };

  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Letzte Aktualisierung',
    example: '2024-01-15T11:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({
    description: 'User-ID des Erstellers (CUID2)',
    example: 'cuid2usr123abc456def',
  })
  createdBy!: string;

  @ApiPropertyOptional({
    description: 'User-ID des letzten Bearbeiters (CUID2)',
    example: 'cuid2usr789xyz012abc',
  })
  updatedBy?: string;

  @ApiPropertyOptional({
    description: 'Zugewiesene Einheit-ID (CUID2, null wenn keiner Einheit zugewiesen)',
    example: 'cuid2ein123abc456def',
  })
  einheitId?: string;

  @ApiProperty({
    description: 'Fahrzeugtyp Details (nested)',
  })
  fahrzeugtyp!: FahrzeugtypDto;

  @ApiPropertyOptional({
    description: 'Zugewiesene Besatzung (Personen)',
    type: () => [BesatzungMemberDto],
    example: [
      { id: 'clw3h8ijk7l8m9nop0qr', vorname: 'Max', nachname: 'Mustermann' },
      { id: 'clw4i9jkl8m9n0opq1rs', vorname: 'Anna', nachname: 'Schmidt' },
    ],
  })
  besatzung?: BesatzungMemberDto[];
}

/**
 * Vereinfachtes DTO für Besatzungs-Mitglieder.
 *
 * Enthält nur die wichtigsten Felder für kompakte Listen-Darstellung.
 */
export class BesatzungMemberDto {
  @ApiProperty({ description: 'EinsatzPerson ID (CUID2)' })
  id!: string;

  @ApiProperty({ description: 'Vorname' })
  vorname!: string;

  @ApiProperty({ description: 'Nachname' })
  nachname!: string;
}

/**
 * Vereinfachtes DTO für Listen-Ansichten.
 *
 * Enthält nur die wichtigsten Felder für Übersichtstabellen.
 */
export class EinsatzFahrzeugListItemDto {
  @ApiProperty({ description: 'EinsatzFahrzeug ID (CUID2)' })
  id!: string;

  @ApiProperty({ description: 'Funkrufname' })
  funkrufname!: string;

  @ApiPropertyOptional({ description: 'Kennzeichen' })
  kennzeichen?: string;

  @ApiProperty({ description: 'FMS-Status (0-9)' })
  fmsStatus!: number;

  @ApiProperty({ description: 'Fahrzeugtyp Bezeichnung' })
  fahrzeugtypBezeichnung!: string;
}
