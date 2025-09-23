import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { EtbKategorie } from '@prisma/client';

export class UpdateEtbEintragDto {
  @ApiPropertyOptional({
    description: 'Updated timestamp of the entry',
    example: '2024-01-15T10:35:00Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: Date;

  @ApiPropertyOptional({
    description: 'Updated category of the ETB entry',
    enum: EtbKategorie,
    example: EtbKategorie.MASSNAHME,
  })
  @IsOptional()
  @IsEnum(EtbKategorie)
  kategorie?: EtbKategorie;

  @ApiPropertyOptional({
    description: 'Updated text content of the entry',
    example: 'Korrektur: Brand im 3. OG, nicht 2. OG',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Reason for the change (for audit trail)',
    example: 'Korrektur der Stockwerksangabe',
  })
  @IsOptional()
  @IsString()
  changeReason?: string;
}
