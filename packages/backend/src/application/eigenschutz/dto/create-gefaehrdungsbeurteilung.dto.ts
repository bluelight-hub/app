import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

/**
 * Request-DTO für `POST …/gefaehrdungsbeurteilungen`.
 *
 * Validierung ist absichtlich klassenbasiert (class-validator), konsistent
 * mit den anderen Backend-DTOs. Die semantischen Constraints spiegeln das
 * Shared-Zod-Schema `createGefaehrdungsbeurteilungSchema` aus
 * `packages/shared/src/schemas/eigenschutz/` (AC6: Single-Source-of-Truth bei
 * der _Semantik_, bis die Backend-ESM-Migration die direkten Zod-Imports
 * erlaubt — identische Regex).
 */
export class CreateGefaehrdungsbeurteilungDto {
  @ApiProperty({ description: 'CUID der Einsatzeinheit', example: 'clw3h8x9y0000qwertyui00050' })
  @IsString({ message: 'einheitId muss ein Text sein' })
  @IsNotEmpty({ message: 'einheitId ist erforderlich' })
  @Matches(/^[a-z0-9]{20,32}$/, { message: 'einheitId hat kein gültiges CUID-Format' })
  einheitId!: string;

  @ApiPropertyOptional({ description: 'CUID der Vorlage (optional)', example: 'clw3h8x9y0000qwertyui00111' })
  @IsOptional()
  @IsString({ message: 'vorlageId muss ein Text sein' })
  @Matches(/^[a-z0-9]{20,32}$/, { message: 'vorlageId hat kein gültiges CUID-Format' })
  vorlageId?: string;

  @ApiPropertyOptional({ description: 'CUID der Gefahrenzone (optional — FR54)', example: 'clw3h8x9y0000qwertyui00222' })
  @IsOptional()
  @IsString({ message: 'gefahrenzoneId muss ein Text sein' })
  @Matches(/^[a-z0-9]{20,32}$/, { message: 'gefahrenzoneId hat kein gültiges CUID-Format' })
  gefahrenzoneId?: string;
}
