import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ALARMIERUNG_STATUS_VALUES, type AlarmierungStatus } from '@domain/aggregates/alarmierung/alarmierung.entity';

/**
 * Query-Parameter für die Listen-Abfrage von Alarmierungen.
 *
 * Sortierung ist server-seitig fix `alarmierungszeit DESC` (siehe Query-Handler).
 */
export class ListAlarmierungenQueryDto {
  @ApiPropertyOptional({ enum: ALARMIERUNG_STATUS_VALUES, description: 'Filter nach Status' })
  @IsOptional()
  @IsIn(ALARMIERUNG_STATUS_VALUES as readonly string[])
  status?: AlarmierungStatus;

  @ApiPropertyOptional({ description: 'Pagination: Anzahl überspringen', minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ description: 'Pagination: maximale Anzahl', minimum: 1, maximum: 200, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;
}
