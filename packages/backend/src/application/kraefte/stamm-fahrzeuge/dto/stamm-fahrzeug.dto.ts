import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FahrzeugtypDto } from '../../fahrzeugtypen/dto';

/**
 * Response DTO für StammFahrzeug-Daten in API-Responses.
 *
 * Trennt Domain-Schicht (StammFahrzeug Aggregate) von API-Schicht.
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
 * **Fahrzeugtyp-Relation:**
 * - FahrzeugtypDto wird IMMER mitgeliefert (Query joined)
 * - Wichtig für Frontend: Kann Fahrzeugtyp-Infos direkt anzeigen
 * - Vermeidet zusätzliche API-Calls für Fahrzeugtyp-Details
 * - FahrzeugtypId ist IMMUTABLE (kann nach Erstellung nicht geändert werden)
 *
 * **Archive-Pattern:**
 * - archivedAt/archivedBy statt isDeleted
 * - Soft-Delete mit Audit-Trail
 * - Archivierte Fahrzeuge werden in Listen ausgeblendet
 */
export class StammFahrzeugDto {
  @ApiProperty({
    description: 'Eindeutige StammFahrzeug-ID (CUID2 Format)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Fahrzeugbezeichnung (z.B. "RTW 1", "KTW 2")',
    example: 'RTW 1',
  })
  rufname!: string;

  @ApiProperty({
    description: 'Funkrufzeichen (UNIQUE) - z.B. "Rotkreuz 83/1"',
    example: 'Rotkreuz 83/1',
  })
  funkrufname!: string;

  @ApiProperty({
    description: 'Fahrzeugtyp-ID (FK zu Fahrzeugtyp aus Epic 1) - IMMUTABLE',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  fahrzeugtypId!: string;

  @ApiProperty({
    description: 'Fahrzeugtyp-Details (joined)',
    type: () => FahrzeugtypDto,
  })
  fahrzeugtyp!: FahrzeugtypDto;

  @ApiPropertyOptional({
    description: 'Kfz-Kennzeichen (z.B. "DA-RK 101")',
    example: 'DA-RK 101',
  })
  kennzeichen?: string;

  @ApiPropertyOptional({
    description: 'Baujahr des Fahrzeugs',
    example: 2022,
  })
  baujahr?: number;

  @ApiPropertyOptional({
    description: 'BOS-Funkkennung',
    example: '83/1/1',
  })
  funkkenungBOS?: string;

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
    description: 'Letzter Aktualisierungszeitpunkt',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'User-ID des Erstellers',
    example: 'clw3h8x9y0001qwertyuiopas',
  })
  createdBy!: string;

  @ApiPropertyOptional({
    description: 'User-ID des letzten Bearbeiters',
    example: 'clw3h8x9y0001qwertyuiopas',
  })
  updatedBy?: string;
}
