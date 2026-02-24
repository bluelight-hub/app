import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO fuer Einsatz-Rollenzuweisungen.
 *
 * Story 5.2 AC4: GET /api/v-alpha/einsaetze/:id/rollen
 * Response: Array von { userId, userName, rolle }
 */
export class EinsatzRolleDto {
  @ApiProperty({
    description: 'User-ID (CUID2)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  userId!: string;

  @ApiProperty({
    description: 'Username des zugewiesenen Users',
    example: 'tschmidt',
  })
  userName!: string;

  @ApiProperty({
    description: 'Zugewiesene Rolle im Einsatz',
    enum: ['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER'],
    example: 'BEFEHLSGEBER',
  })
  rolle!: string;
}
