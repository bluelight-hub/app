import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO für das Zuweisen eines Fahrzeugs zu einer taktischen Einheit.
 *
 * einheitId ist optional/nullable:
 * - String (CUID2): Fahrzeug einer Einheit zuweisen
 * - null/undefined: Fahrzeug von Einheit entfernen
 */
export class AssignFahrzeugToEinheitDto {
  @ApiPropertyOptional({ description: 'Einheit-ID (CUID2) oder null zum Entfernen', example: 'clx1234567890abcdef12345', type: String })
  @IsString()
  @IsOptional()
  einheitId?: string | null;
}
