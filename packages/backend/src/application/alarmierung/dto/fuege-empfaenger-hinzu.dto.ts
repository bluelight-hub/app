import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ALARMIERUNG_EMPFAENGER_KIND_VALUES, type AlarmierungEmpfaengerKindValue } from './alarmierung-empfaenger.dto';

/**
 * Request-DTO zum nachträglichen Hinzufügen eines einzelnen Empfängers.
 *
 * Genau eine der ID-Felder (fahrzeugId / personId / einheitId) muss gesetzt sein —
 * konsistent zum `kind`-Diskriminator.
 */
export class FuegeEmpfaengerHinzuDto {
  @ApiProperty({ enum: ALARMIERUNG_EMPFAENGER_KIND_VALUES, example: 'fahrzeug' })
  @IsIn(ALARMIERUNG_EMPFAENGER_KIND_VALUES)
  kind!: AlarmierungEmpfaengerKindValue;

  @ApiPropertyOptional({ description: 'ID eines Einsatz-Fahrzeugs (nur bei kind=fahrzeug)', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  fahrzeugId?: string;

  @ApiPropertyOptional({ description: 'ID einer Einsatz-Person (nur bei kind=person)', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  personId?: string;

  @ApiPropertyOptional({ description: 'ID einer Einsatz-Einheit (nur bei kind=einheit)', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  einheitId?: string;

  @ApiPropertyOptional({ description: 'Optionaler Name-Snapshot. Wenn leer, ermittelt der Handler den Namen.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameSnapshot?: string;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true, description: 'Optionaler eigener Alarmiert-Zeitpunkt' })
  @IsOptional()
  alarmiertAm?: Date | string;
}
