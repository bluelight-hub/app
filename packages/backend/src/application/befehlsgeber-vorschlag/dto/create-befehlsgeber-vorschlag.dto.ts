import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** DTO zum Erstellen eines neuen BefehlsgeberVorschlags. */
export class CreateBefehlsgeberVorschlagDto {
  @ApiProperty({ description: 'Kuerzel (z.B. EL, ZF)', example: 'EL', minLength: 1, maxLength: 20 })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  kuerzel!: string;

  @ApiProperty({ description: 'Anzeige-Label', example: 'EL (Einsatzleiter)', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  label!: string;

  @ApiPropertyOptional({ description: 'Sortierreihenfolge', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
