import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { EtbKategorie } from '@prisma/client';

export class CreateEtbEintragDto {
  @ApiPropertyOptional({
    description: 'Timestamp of the entry (defaults to current time)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: Date;

  @ApiProperty({
    description: 'Category of the ETB entry',
    enum: EtbKategorie,
    example: EtbKategorie.LAGE,
  })
  @IsEnum(EtbKategorie)
  @IsNotEmpty()
  kategorie!: EtbKategorie;

  @ApiProperty({
    description: 'Text content of the entry',
    example: 'Erste Erkundung abgeschlossen, Brand im 2. OG lokalisiert',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;
}
