import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Request-Body für `POST …/vorfaelle/:vorfallId/schliessen` (Issue #415).
 *
 * Die Begründung ist optional (max 500 Zeichen). Empty-String und Whitespace-
 * only werden im Handler zu `null` normalisiert.
 */
export class CloseVorfallDto {
  @ApiPropertyOptional({ description: 'Optionale Begründung der Schließung (max 500 Zeichen).', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  begruendung?: string;
}
