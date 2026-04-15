import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA, type AlarmierungEmpfaengerInputDto } from './alarmierung-empfaenger.dto';

/**
 * Request-DTO zum Auslösen einer neuen Alarmierung.
 *
 * Empfänger sind eine diskriminierte Union — siehe
 * {@link ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA} für das OpenAPI-Schema.
 *
 * **Empfänger-Validierung:** Die Sub-DTO-Klassen tragen keine
 * `class-validator`-Decorators (siehe Header-Kommentar in
 * `alarmierung-empfaenger.dto.ts`); Pflichtfelder + Diskriminator + XOR
 * werden vom `ErstelleAlarmierungCommand` und vom Aggregat selbst
 * validiert. Hier auf der Liste prüfen wir lediglich, dass das Feld ein
 * Array ist — Inhaltsstruktur und Mindestanzahl prüft das Command.
 */
export class CreateAlarmierungDto {
  @ApiProperty({ example: 'Brandschutzgruppe Süd', description: 'Bezeichnung der Alarmierung', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  bezeichnung!: string;

  @ApiPropertyOptional({ example: 'Industriebrand B-Stufe', description: 'Optionale Beschreibung', nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  beschreibung?: string;

  @ApiPropertyOptional({ description: 'Optionaler Trigger-Zeitpunkt (Default: jetzt).', type: 'string', format: 'date-time', nullable: true })
  @IsOptional()
  alarmierungszeit?: Date | string;

  @ApiProperty({
    isArray: true,
    ...ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA,
  })
  @IsArray()
  empfaenger!: AlarmierungEmpfaengerInputDto[];
}
