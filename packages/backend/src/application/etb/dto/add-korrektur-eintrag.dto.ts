import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ETB_KATEGORIE_VALUES, type EtbKategorieValue } from '@domain/value-objects/etb-kategorie';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO fuer AddKorrekturEintrag-Request.
 *
 * Gleiche Felder wie AddEintragDto - die originalEintragId kommt aus dem URL-Parameter.
 * ETB-Eintraege sind nach Erstellung unveraenderlich (Issue #554).
 */
export class AddKorrekturEintragDto {
  @ApiProperty({
    description: 'Korrektur-Text (ersetzt den Original-Text inhaltlich)',
    example: 'Fahrzeug W1 um 14:35 Uhr eingetroffen (nicht 14:30 Uhr)',
    minLength: 1,
    maxLength: 65535,
  })
  @IsString({ message: 'text muss ein String sein' })
  @MinLength(1, { message: 'text darf nicht leer sein' })
  @MaxLength(65535, { message: 'Text darf maximal 65535 Zeichen lang sein' })
  text!: string;

  @ApiPropertyOptional({
    description: 'Kategorie des Korrektur-Eintrags (default: Kategorie des Originals)',
    enum: ETB_KATEGORIE_VALUES,
    example: 'LAGE',
  })
  @IsOptional()
  @IsEnum(ETB_KATEGORIE_VALUES, { message: 'kategorie muss ein gueltiger EtbKategorie-Wert sein' })
  kategorie?: EtbKategorieValue;

  @ApiPropertyOptional({
    description: 'Absender des Korrektur-Eintrags',
    example: 'Rotkreuz 83/1',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'absender muss ein String sein' })
  @MaxLength(100, { message: 'Absender darf maximal 100 Zeichen lang sein' })
  absender?: string;

  @ApiPropertyOptional({
    description: 'Empfaenger des Korrektur-Eintrags',
    example: 'LST Darmstadt',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'empfaenger muss ein String sein' })
  @MaxLength(100, { message: 'Empfaenger darf maximal 100 Zeichen lang sein' })
  empfaenger?: string;

  @ApiPropertyOptional({
    description: 'Optionale Metadaten',
    nullable: true,
  })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Zeitpunkt des Auftretens (ISO 8601)',
    example: '2025-01-15T14:30:00.000Z',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'occurredAt muss ein gueltiger ISO 8601 DateTime String sein' })
  occurredAt?: string;
}
