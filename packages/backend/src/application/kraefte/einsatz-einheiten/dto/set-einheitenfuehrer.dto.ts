import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO für das Setzen/Entfernen des Einheitenführers.
 *
 * **Verwendung:**
 * - fuehrerId gesetzt: Weist die angegebene EinsatzPerson als Einheitenführer zu
 * - fuehrerId null/undefined: Entfernt den aktuellen Einheitenführer
 *
 * Die EinsatzPerson muss der Einheit bereits zugewiesen sein.
 */
export class SetEinheitenfuehrerDto {
  @ApiPropertyOptional({
    description: 'EinsatzPerson-ID des Führers (CUID2), null zum Entfernen',
    example: 'clw3h8ijk7l8m9nop0qr',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  fuehrerId?: string | null;
}
