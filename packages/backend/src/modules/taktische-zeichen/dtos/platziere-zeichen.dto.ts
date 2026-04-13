import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class PlatziereZeichenDto {
  @ApiProperty({ description: 'ID der Lagekarte' })
  @IsString()
  @IsNotEmpty()
  lagekarteId!: string;

  @ApiProperty({ description: 'WGS84 Breitengrad' })
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'WGS84 Längengrad' })
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ description: 'MGRS-Koordinate (optional)' })
  @IsString()
  @IsOptional()
  mgrs?: string;
}
