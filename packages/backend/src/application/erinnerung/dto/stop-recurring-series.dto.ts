import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO für den Request Body von PATCH /:id/stop-recurring (Story 6.5).
 */
export class StopRecurringSeriesDto {
  /** Auch die aktuelle aktive Instanz abbrechen (default: false) */
  @ApiPropertyOptional({
    description: 'Auch die aktuelle aktive Instanz abbrechen',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelCurrent?: boolean;
}
