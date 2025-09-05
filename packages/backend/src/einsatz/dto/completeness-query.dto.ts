import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * DTO für Query-Parameter beim Abrufen der Vollständigkeit
 */
export class CompletenessQueryDto {
  @ApiPropertyOptional({
    description: 'Cache umgehen und neu berechnen',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  refresh?: boolean = false;
}
