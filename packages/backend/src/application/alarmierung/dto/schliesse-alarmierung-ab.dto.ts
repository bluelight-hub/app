import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request-DTO für den Abschluss einer Alarmierung.
 *
 * Aktuell enthält das DTO nur einen optionalen Notiz-Hinweis, ist aber
 * vorhanden, damit der Endpoint OpenAPI-konform einen Body deklariert
 * und spätere Erweiterungen (z.B. AbschlussGrund) nicht-breaking sind.
 */
export class SchliesseAlarmierungAbDto {
  @ApiPropertyOptional({ description: 'Optionaler Hinweis zum Abschluss', nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notiz?: string;
}
