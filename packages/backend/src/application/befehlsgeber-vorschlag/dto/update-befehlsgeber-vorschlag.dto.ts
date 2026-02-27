import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** DTO zum Aktualisieren eines BefehlsgeberVorschlags (Partial Update). */
export class UpdateBefehlsgeberVorschlagDto {
  @ApiPropertyOptional({ description: 'Kuerzel (z.B. EL, ZF)', example: 'EL', minLength: 1, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  kuerzel?: string;

  @ApiPropertyOptional({ description: 'Anzeige-Label', example: 'EL (Einsatzleiter)', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  label?: string;

  @ApiPropertyOptional({ description: 'Sortierreihenfolge', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Ob der Vorschlag aktiv ist' })
  @IsOptional()
  @IsBoolean()
  istAktiv?: boolean;
}
