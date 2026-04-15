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
 * Request-DTO für eine Nachalarmierung. Verhält sich strukturell wie
 * {@link CreateAlarmierungDto}, referenziert aber via `ursprungAlarmierungId`
 * eine bestehende Alarmierung des gleichen Einsatzes.
 */
export class ErstelleNachalarmierungDto {
  @ApiProperty({ example: 'Brandschutzgruppe Süd – Verstärkung', description: 'Bezeichnung der Nachalarmierung', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  bezeichnung!: string;

  @ApiPropertyOptional({ example: 'Zwei weitere LF nachgefordert.', description: 'Optionale Beschreibung', nullable: true, maxLength: 2000 })
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
  @Type(() => Object as unknown as new () => AlarmierungEmpfaengerFahrzeugDto | AlarmierungEmpfaengerPersonDto | AlarmierungEmpfaengerEinheitDto)
  empfaenger!: AlarmierungEmpfaengerInputDto[];
}
