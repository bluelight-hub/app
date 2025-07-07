import { IsOptional, IsBoolean, IsString, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { FilterPaginationDto } from '../../../../common/dto/pagination.dto';

export enum IpWhitelistSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  IP_ADDRESS = 'ipAddress',
  LAST_USED_AT = 'lastUsedAt',
  USE_COUNT = 'useCount',
}

export class QueryIpWhitelistDto extends FilterPaginationDto {
  @ApiPropertyOptional({
    description: 'Filtern nach aktiven/inaktiven Einträgen',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filtern nach temporären Einträgen',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isTemporary?: boolean;

  @ApiPropertyOptional({
    description: 'Filtern nach Tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Suche nach IP-Adresse oder Beschreibung',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sortierfeld',
    enum: IpWhitelistSortBy,
    default: IpWhitelistSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(IpWhitelistSortBy)
  sortBy?: IpWhitelistSortBy = IpWhitelistSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Nur abgelaufene Einträge anzeigen',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  onlyExpired?: boolean;

  @ApiPropertyOptional({
    description: 'Sortierreihenfolge',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
