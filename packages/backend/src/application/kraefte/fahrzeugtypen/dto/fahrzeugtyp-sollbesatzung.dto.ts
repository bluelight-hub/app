import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';

/**
 * Nested DTO für Fahrzeugtyp-Sollbesatzung.
 *
 * Definiert die Soll-Besetzung pro Fahrzeugtyp für Einsatzplanung.
 * Alle Felder sind optional, da nicht jeder Fahrzeugtyp alle Rollen benötigt.
 *
 * **Verwendung:**
 * - Wird in CreateFahrzeugtypDto und UpdateFahrzeugtypDto als @ValidateNested eingebettet
 * - Wird als JSONB in Prisma gespeichert
 *
 * **Validierung:**
 * - Alle Werte müssen Ganzzahlen sein (IsInt)
 * - Alle Werte müssen >= 0 sein (Min(0))
 */
export class FahrzeugtypSollbesatzungDto {
  @ApiPropertyOptional({
    description: 'Anzahl Fahrer',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'fahrer muss eine Ganzzahl sein' })
  @Min(0, { message: 'fahrer muss >= 0 sein' })
  fahrer?: number;

  @ApiPropertyOptional({
    description: 'Anzahl Sanitäter',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'sanitaeter muss eine Ganzzahl sein' })
  @Min(0, { message: 'sanitaeter muss >= 0 sein' })
  sanitaeter?: number;

  @ApiPropertyOptional({
    description: 'Anzahl Notärzte',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'notarzt muss eine Ganzzahl sein' })
  @Min(0, { message: 'notarzt muss >= 0 sein' })
  notarzt?: number;

  @ApiPropertyOptional({
    description: 'Anzahl Funktrupp-Mitglieder',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'funktrupp muss eine Ganzzahl sein' })
  @Min(0, { message: 'funktrupp muss >= 0 sein' })
  funktrupp?: number;

  @ApiPropertyOptional({
    description: 'Anzahl sonstige Helfer',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'helfer muss eine Ganzzahl sein' })
  @Min(0, { message: 'helfer muss >= 0 sein' })
  helfer?: number;
}
