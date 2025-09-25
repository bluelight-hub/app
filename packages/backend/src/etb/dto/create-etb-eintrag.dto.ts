import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDate, MaxLength } from 'class-validator';
import { EtbKategorie } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * DTO zum Anlegen eines neuen ETB-Eintrags.
 */
export class CreateEtbEintragDto {
  @ApiPropertyOptional({
    description: 'Timestamp of the entry (defaults to current time)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'timestamp muss ein gültiges Datum sein' })
  timestamp?: Date;

  @ApiProperty({
    description: 'Category of the ETB entry',
    enum: EtbKategorie,
    example: EtbKategorie.LAGE,
  })
  @IsEnum(EtbKategorie, { message: 'kategorie ist ungültig' })
  @IsNotEmpty({ message: 'kategorie darf nicht leer sein' })
  kategorie!: EtbKategorie;

  @ApiProperty({
    description: 'Text content of the entry',
    example: 'Erste Erkundung abgeschlossen, Brand im 2. OG lokalisiert',
  })
  @IsString({ message: 'text muss eine Zeichenkette sein' })
  @IsNotEmpty({ message: 'text darf nicht leer sein' })
  @MaxLength(2000, { message: 'text darf maximal 2000 Zeichen lang sein' })
  text!: string;
}
