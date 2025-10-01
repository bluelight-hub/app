import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { FilterPaginationDto } from '@/common/dto/pagination.dto';
import { ETB_SORT_FIELDS, type EtbSortBy } from '../etb.constants';

/**
 * DTO für ETB-Abfragen mit erweiterten Paginierungs- und Sortieroptionen
 */
export class EtbPaginationDto extends FilterPaginationDto {
  /**
   * Feld nach dem sortiert werden soll
   */
  @ApiPropertyOptional({
    description: 'Feld nach dem sortiert werden soll',
    default: 'timestamp',
    example: 'timestamp',
    enum: ETB_SORT_FIELDS,
  })
  @IsOptional()
  @IsString()
  @IsIn(ETB_SORT_FIELDS as readonly string[], {
    message: `Sortierfeld muss eines von: ${ETB_SORT_FIELDS.join(', ')} sein`,
  })
  sortBy?: EtbSortBy = 'timestamp';

  /**
   * Sortierreihenfolge
   */
  @ApiPropertyOptional({
    description: 'Sortierreihenfolge',
    default: 'desc',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['asc', 'desc'], {
    message: 'Sortierreihenfolge muss entweder asc oder desc sein',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * Gelöschte Einträge einschließen (Soft-Delete)
   */
  @ApiPropertyOptional({
    description: 'Gelöschte Einträge einschließen',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean = false;
}
