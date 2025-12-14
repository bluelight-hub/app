import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { QualifikationKategorie } from '@prisma/client';

/**
 * Input DTO für das Aktualisieren einer Qualifikation.
 *
 * Alle Felder sind optional - nur übergebene Felder werden aktualisiert.
 */
export class UpdateQualifikationDto {
  @ApiPropertyOptional({
    description: 'Name der Qualifikation',
    example: 'Notfallsanitäter',
    minLength: 3,
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Name muss mindestens 3 Zeichen haben' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen haben' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Eindeutige Abkürzung',
    example: 'NotSan',
    minLength: 2,
    maxLength: 20,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Abkürzung muss mindestens 2 Zeichen haben' })
  @MaxLength(20, { message: 'Abkürzung darf maximal 20 Zeichen haben' })
  abkuerzung?: string;

  @ApiPropertyOptional({
    description: 'Kategorie der Qualifikation',
    enum: QualifikationKategorie,
    example: 'SANITAET',
  })
  @IsOptional()
  @IsEnum(QualifikationKategorie, {
    message: `Kategorie muss einer der folgenden Werte sein: ${Object.values(QualifikationKategorie).join(', ')}`,
  })
  kategorie?: QualifikationKategorie;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Staatlich anerkannte Ausbildung im Rettungsdienst',
    maxLength: 1000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Beschreibung darf maximal 1000 Zeichen haben' })
  beschreibung?: string;

  @ApiPropertyOptional({
    description: 'Aktivierungsstatus',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'istAktiv muss ein Boolean sein' })
  istAktiv?: boolean;
}
