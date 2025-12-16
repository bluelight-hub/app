import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO für FunkStatusConfig-Daten in API-Responses.
 *
 * Trennt Domain-Schicht (FunkStatusConfig Aggregate) von API-Schicht.
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
export class FunkStatusConfigDto {
  @ApiProperty({
    description: 'Eindeutige ID (CUID2)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  id!: string;

  @ApiProperty({
    description: 'Status-Code (0-9)',
    minimum: 0,
    maximum: 9,
    example: 0,
  })
  code!: number;

  @ApiProperty({
    description: 'Standard-Label nach DIN 14610',
    example: 'Einsatzbereit (FMS)',
  })
  standardLabel!: string;

  @ApiPropertyOptional({
    description: 'Angepasstes Label (überschreibt Standard)',
    example: 'Verfügbar',
  })
  customLabel?: string;

  @ApiProperty({
    description: 'Angezeigtes Label (customLabel falls vorhanden, sonst standardLabel)',
    example: 'Verfügbar',
  })
  displayLabel!: string;

  @ApiPropertyOptional({
    description: 'Farbe als Hex-Code (#RRGGBB)',
    example: '#00FF00',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  farbe?: string;

  @ApiProperty({
    description: 'Ob Fahrzeuge mit diesem Status alarmierbar sind',
    example: true,
  })
  istAlarmierbar!: boolean;

  @ApiPropertyOptional({
    description: 'Beschreibung des Status',
    example: 'Fahrzeug ist einsatzbereit und kann alarmiert werden',
  })
  beschreibung?: string;

  @ApiProperty({
    description: 'Ob dieser Status bearbeitet werden kann (nur 7-9)',
    example: false,
  })
  isEditable!: boolean;

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
