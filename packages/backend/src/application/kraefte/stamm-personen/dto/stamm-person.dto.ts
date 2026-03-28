import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO für einzelne Qualifikation einer StammPerson.
 *
 * Enthält Basis-Informationen der Qualifikation plus Audit-Trail
 * für die Zuweisung (wann/wer hat zugewiesen).
 *
 * **Architektur-Entscheidung:**
 * - Denormalisiert Qualifikations-Daten für bessere API-Performance
 * - Vermeidet zusätzliche API-Calls für Qualifikations-Details
 * - Frontend kann Qualifikationen direkt anzeigen ohne separate Requests
 */
export class StammPersonQualifikationDto {
  @ApiProperty({
    description: 'ID der Qualifikation (CUID)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Name der Qualifikation',
    example: 'Rettungssanitäter',
  })
  name!: string;

  @ApiProperty({
    description: 'Kürzel der Qualifikation',
    example: 'RS',
  })
  kuerzel!: string;

  @ApiPropertyOptional({
    description: 'Wann wurde die Qualifikation der Person zugewiesen',
    example: '2024-01-15T10:30:00.000Z',
  })
  zugewiesenAm?: Date;

  @ApiPropertyOptional({
    description: 'User-ID desjenigen, der die Qualifikation zugewiesen hat',
    example: 'clw3h8x9y0001qwertyuiopas',
  })
  zugewiesenVon?: string;
}

/**
 * Response DTO für StammPerson-Daten in API-Responses.
 *
 * Trennt Domain-Schicht (StammPerson Aggregate) von API-Schicht.
 * Enthält alle relevanten Felder für API-Consumers.
 *
 * **Architektur-Entscheidung [AI-R7]:**
 * DTOs im Application Layer verwenden NestJS/Swagger-Decorators (@ApiProperty),
 * obwohl dies Framework-Agnostizität (AC3) leicht verletzt. Diese pragmatische
 * Entscheidung vermeidet redundanten Mapping-Overhead zwischen Presentation Layer
 * (Controller) und Application Layer (Handlers). DTOs dienen primär der API-
 * Dokumentierung und Serialisierung - die Business Logic bleibt framework-agnostisch
 * in Domain Aggregates und Command Handlers gekapselt.
 *
 * **Qualifikationen-Relation:**
 * - Qualifikationen werden IMMER mitgeliefert (Query joined)
 * - Wichtig für Frontend: Kann Qualifikationen direkt anzeigen
 * - Vermeidet zusätzliche API-Calls für Qualifikations-Details
 * - Enthält Audit-Trail (zugewiesenAm/zugewiesenVon)
 *
 * **Archive-Pattern:**
 * - archivedAt/archivedBy statt isDeleted
 * - Soft-Delete mit Audit-Trail
 * - Archivierte Personen werden in Listen ausgeblendet
 *
 * **Personalnummer:**
 * - UNIQUE Constraint in DB
 * - IMMUTABLE: Kann nach Erstellung NICHT geändert werden
 */
export class StammPersonDto {
  @ApiProperty({
    description: 'Eindeutige StammPerson-ID (CUID2 Format)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Vorname der Person',
    example: 'Max',
  })
  vorname!: string;

  @ApiProperty({
    description: 'Nachname der Person',
    example: 'Mustermann',
  })
  nachname!: string;

  @ApiProperty({
    description: 'Personalnummer (eindeutig) - IMMUTABLE',
    example: '12345',
  })
  personalnummer!: string;

  @ApiPropertyOptional({
    description: 'BOS-Funkkennung der Person',
    example: '83/47/1',
  })
  funkkenungBOS?: string;

  @ApiProperty({
    description: 'Qualifikationen der Person (joined)',
    type: [StammPersonQualifikationDto],
  })
  qualifikationen!: StammPersonQualifikationDto[];

  @ApiPropertyOptional({
    description: 'Archivierungs-Zeitpunkt (Soft-Delete)',
    example: '2024-01-15T10:30:00.000Z',
  })
  archivedAt?: Date;

  @ApiPropertyOptional({
    description: 'User-ID des Archivierers',
    example: 'clw3h8x9y0001qwertyuiopas',
  })
  archivedBy?: string;

  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'User-ID des Erstellers',
    example: 'clw3h8x9y0001qwertyuiopas',
  })
  createdBy!: string;

  @ApiPropertyOptional({
    description: 'Letzter Aktualisierungszeitpunkt',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt?: Date;

  @ApiPropertyOptional({
    description: 'User-ID des letzten Bearbeiters',
    example: 'clw3h8x9y0001qwertyuiopas',
  })
  updatedBy?: string;

  @ApiPropertyOptional({
    description: 'Zugewiesener Benutzer-Account (falls vorhanden)',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'User-ID' },
      username: { type: 'string', description: 'Benutzername' },
    },
    nullable: true,
  })
  userAccount?: { id: string; username: string } | null;
}
