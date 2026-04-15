import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ALARMIERUNG_STATUS_VALUES, type AlarmierungStatus } from '@domain/aggregates/alarmierung/alarmierung.entity';
import { AlarmierungEmpfaengerResponseDto } from './alarmierung-empfaenger.dto';

/**
 * Response-DTO einer Alarmierung inkl. Empfänger-Liste und berechneter
 * Reaktionszeiten (siehe {@link AlarmierungEmpfaengerResponseDto}).
 */
export class AlarmierungResponseDto {
  @ApiProperty({ example: 'clalarm...', description: 'Alarmierungs-ID' })
  id!: string;

  @ApiProperty({ example: 'cleinsatz...', description: 'Zugehörige Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ example: 'Brandschutzgruppe Süd', description: 'Bezeichnung / Schlagwort der Alarmierung' })
  bezeichnung!: string;

  @ApiPropertyOptional({ example: 'Industriebrand, B-Stufe', description: 'Optionale Beschreibung', nullable: true })
  beschreibung?: string | null;

  @ApiProperty({ enum: ALARMIERUNG_STATUS_VALUES, example: 'aktiv' })
  status!: AlarmierungStatus;

  @ApiProperty({ type: 'string', format: 'date-time', description: 'Zeitpunkt der Alarmierung (Triggerzeit)' })
  alarmierungszeit!: Date;

  @ApiPropertyOptional({
    description: 'ID der Ursprungsalarmierung — nur gesetzt bei Nachalarmierungen.',
    nullable: true,
    example: 'clalarm-original',
  })
  ursprungAlarmierungId?: string | null;

  @ApiProperty({ description: 'Ist diese Alarmierung eine Nachalarmierung?', example: false })
  istNachalarmierung!: boolean;

  @ApiProperty({ type: () => [AlarmierungEmpfaengerResponseDto], description: 'Empfänger dieser Alarmierung' })
  empfaenger!: AlarmierungEmpfaengerResponseDto[];

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: 'string', format: 'date-time' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'User-ID des Erstellers', nullable: true })
  createdBy?: string | null;

  @ApiPropertyOptional({ description: 'User-ID des letzten Editors', nullable: true })
  updatedBy?: string | null;
}
