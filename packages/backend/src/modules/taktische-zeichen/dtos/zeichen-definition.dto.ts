import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class ZeichenDefinitionRequestDto {
  @ApiProperty({ description: 'Grundzeichen (z.B. "kraftfahrzeug-gelaendegaengig")' })
  @IsString()
  @IsNotEmpty()
  grundzeichen!: string;

  @ApiPropertyOptional({ description: 'Organisation (z.B. "feuerwehr")' })
  @IsString()
  @IsOptional()
  organisation?: string;

  @ApiPropertyOptional({ description: 'Fachaufgabe (z.B. "brandbekaempfung")' })
  @IsString()
  @IsOptional()
  fachaufgabe?: string;

  @ApiPropertyOptional({ description: 'Einheitsgröße (z.B. "gruppe")' })
  @IsString()
  @IsOptional()
  einheit?: string;

  @ApiPropertyOptional({ description: 'Verwaltungsstufe (z.B. "kreis")' })
  @IsString()
  @IsOptional()
  verwaltungsstufe?: string;

  @ApiPropertyOptional({ description: 'Symbol-ID' })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Freitext-Beschriftung' })
  @IsString()
  @IsOptional()
  text?: string;
}
