import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO für EinsatzEinheit (Listen-Ansicht).
 *
 * Repräsentiert eine taktische Einheit innerhalb eines Einsatzes.
 * Einheiten können hierarchisch organisiert sein (parentId → übergeordnete Einheit).
 *
 * **Typen:** TRUPP, STAFFEL, GRUPPE, ZUG, ABSCHNITT
 * **Status-Übergänge:** AUFGESTELLT → EINSATZBEREIT → IM_EINSATZ → AUFGELOEST
 */
export class EinsatzEinheitDto {
  @ApiProperty({
    description: 'Eindeutige ID der EinsatzEinheit (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({
    description: 'Einsatz-ID zu dem diese Einheit gehört (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  einsatzId!: string;

  @ApiPropertyOptional({
    description: 'Übergeordnete Einheit-ID (CUID2), null für Root-Einheiten',
    example: 'clw4i9jkl8m9n0opq1rs',
    nullable: true,
  })
  parentId!: string | null;

  @ApiProperty({
    description: 'Name der Einheit',
    example: '1. Bergungsgruppe',
  })
  name!: string;

  @ApiProperty({
    description: 'Typ der taktischen Einheit',
    enum: ['TRUPP', 'STAFFEL', 'GRUPPE', 'ZUG', 'ABSCHNITT'],
    example: 'GRUPPE',
  })
  typ!: string;

  @ApiPropertyOptional({
    description: 'Funktion/Aufgabe der Einheit',
    example: 'Bergung',
    nullable: true,
  })
  funktion!: string | null;

  @ApiProperty({
    description: 'Aktueller Status der Einheit',
    enum: ['AUFGESTELLT', 'EINSATZBEREIT', 'IM_EINSATZ', 'IN_RESERVE', 'AUFGELOEST'],
    example: 'EINSATZBEREIT',
  })
  status!: string;

  @ApiPropertyOptional({
    description: 'EinsatzPerson-ID des Einheitenführers (CUID2)',
    example: 'clw5j0klm9n0o1pqr2st',
    nullable: true,
  })
  einheitenfuehrerId!: string | null;

  @ApiPropertyOptional({
    description: 'Name des Einheitenführers (Vorname Nachname)',
    example: 'Max Mustermann',
    nullable: true,
  })
  einheitenfuehrerName!: string | null;

  @ApiProperty({
    description: 'Soll-Stärke (geplante Personenanzahl)',
    example: 9,
  })
  sollStaerke!: number;

  @ApiProperty({
    description: 'Ist-Stärke (tatsächlich zugewiesene Personen)',
    example: 7,
  })
  istStaerke!: number;

  @ApiPropertyOptional({
    description: 'Aktueller Auftrag der Einheit',
    example: 'Gebäudesicherung Abschnitt Nord',
    nullable: true,
  })
  auftrag!: string | null;

  @ApiPropertyOptional({
    description: 'Einsatzort der Einheit',
    example: 'Hauptstraße 12, Gebäude A',
    nullable: true,
  })
  einsatzort!: string | null;

  @ApiProperty({
    description: 'Erstellungszeitpunkt (ISO 8601)',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Letzte Aktualisierung (ISO 8601)',
    example: '2024-01-15T11:00:00.000Z',
  })
  updatedAt!: string;
}
