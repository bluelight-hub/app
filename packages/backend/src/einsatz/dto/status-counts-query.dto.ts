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
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return false; // Default to false for any other value
  })
  @IsBoolean()
  includeArchived?: boolean = false;
}
