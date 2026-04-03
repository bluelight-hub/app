import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO für das Verschieben einer Einheit in der Hierarchie.
 *
 * **Verwendung:**
 * - parentId gesetzt: Verschiebt die Einheit unter die angegebene übergeordnete Einheit
 * - parentId null/undefined: Macht die Einheit zu einer Root-Einheit (oberste Ebene)
 *
 * **Validierung:**
 * - Zirkuläre Referenzen werden durch Business Logic verhindert
 * - Übergeordnete Einheit muss zum gleichen Einsatz gehören
 */
export class MoveEinheitDto {
  @ApiPropertyOptional({
    description: 'Neue übergeordnete Einheit-ID (CUID2), null für Root-Ebene',
    example: 'clw4i9jkl8m9n0opq1rs',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  parentId?: string | null;
}
