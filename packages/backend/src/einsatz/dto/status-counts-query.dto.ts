import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO für Query-Parameter beim Abrufen von Status-Statistiken
 */
export class StatusCountsQueryDto {
  @ApiPropertyOptional({
    description: 'Archivierte Einsätze in die Zählung einbeziehen',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeArchived?: boolean = false;
}
