import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA,
  AlarmierungEmpfaengerEinheitDto,
  AlarmierungEmpfaengerFahrzeugDto,
  AlarmierungEmpfaengerPersonDto,
  type AlarmierungEmpfaengerInputDto,
} from './alarmierung-empfaenger.dto';

/**
 * Request-DTO zum Auslösen einer neuen Alarmierung.
 *
 * Empfänger sind eine diskriminierte Union — siehe
 * {@link ALARMIERUNG_EMPFAENGER_INPUT_SCHEMA} für das OpenAPI-Schema.
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
  @ValidateNested({ each: true })
  // class-transformer cannot infer subtype from a discriminated union without a hint;
  // we accept any of the three variants, the handler enforces shape via the domain model.
  @Type(() => Object as unknown as new () => AlarmierungEmpfaengerFahrzeugDto | AlarmierungEmpfaengerPersonDto | AlarmierungEmpfaengerEinheitDto)
  empfaenger!: AlarmierungEmpfaengerInputDto[];
}
