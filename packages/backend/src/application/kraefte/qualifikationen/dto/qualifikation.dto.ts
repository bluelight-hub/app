import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QUALIFIKATION_KATEGORIEN, type QualifikationKategorieType } from '@domain/kraefte';

/**
 * Response DTO für Qualifikation-Daten in API-Responses.
 *
 * Trennt Domain-Schicht (Qualifikation Aggregate) von API-Schicht.
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
export class QualifikationDto {
  @ApiProperty({
    description: 'Eindeutige Qualifikation-ID (CUID2 Format)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Name der Qualifikation',
    example: 'Notfallsanitäter',
  })
  name!: string;

  @ApiProperty({
    description: 'Eindeutige Abkürzung',
    example: 'NotSan',
  })
  abkuerzung!: string;

  @ApiProperty({
    description: 'Kategorie der Qualifikation',
    enum: QUALIFIKATION_KATEGORIEN,
    example: 'SANITAET',
  })
  kategorie!: QualifikationKategorieType;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Staatlich anerkannte Ausbildung im Rettungsdienst',
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
