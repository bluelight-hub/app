import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FAHRZEUGTYP_KATEGORIEN, type FahrzeugtypKategorieType } from '@domain/kraefte';
import type { FahrzeugtypSollbesatzungDto } from './fahrzeugtyp-sollbesatzung.dto';

/**
 * Response DTO für Fahrzeugtyp-Daten in API-Responses.
 *
 * Trennt Domain-Schicht (Fahrzeugtyp Aggregate) von API-Schicht.
 * Enthält alle relevanten Felder für API-Consumers.
 *
 * **Architektur-Entscheidung [AI-R7]:**
 * DTOs im Application Layer verwenden NestJS/Swagger-Decorators (@ApiProperty),
 * obwohl dies Framework-Agnostizität (AC3) leicht verletzt. Diese pragmatische
 * Entscheidung vermeidet redundanten Mapping-Overhead zwischen Presentation Layer
 * (Controller) und Application Layer (Handlers). DTOs dienen primär der API-
 * Dokumentation und Serialisierung - die Business Logic bleibt framework-agnostisch
 * in Domain Aggregates und Command Handlers gekapselt.
 */
export class FahrzeugtypDto {
  @ApiProperty({
    description: 'Eindeutige Fahrzeugtyp-ID (CUID2 Format)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Eindeutiger Code (UPPERCASE)',
    example: 'RTW',
  })
  code!: string;

  @ApiProperty({
    description: 'Vollständige Bezeichnung',
    example: 'Rettungswagen',
  })
  bezeichnung!: string;

  @ApiProperty({
    description: 'Kategorie des Fahrzeugtyps',
    enum: FAHRZEUGTYP_KATEGORIEN,
    example: 'RETTUNGSDIENST',
  })
  kategorie!: FahrzeugtypKategorieType;

  @ApiPropertyOptional({
    description: 'Soll-Besetzung pro Rolle (JSONB)',
    example: { fahrer: 1, sanitaeter: 2 },
  })
  sollbesatzung?: FahrzeugtypSollbesatzungDto;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Standard-Rettungswagen nach DIN EN 1789 Typ B',
  })
  beschreibung?: string;

  @ApiProperty({
    description: 'Aktivierungsstatus',
    example: true,
  })
  istAktiv!: boolean;

  @ApiProperty({
    description: 'Sortierreihenfolge',
    example: 0,
  })
  sortOrder!: number;

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
