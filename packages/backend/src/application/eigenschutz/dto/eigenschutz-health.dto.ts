import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für den Eigenschutz-Modul-Health-Endpoint (Story 1.6 AC2).
 *
 * Signalisiert dem Frontend, dass der `EigenschutzModule`-Slice im Backend
 * geladen und die Guard-Kette (JWT → Einsatz-Scope → Eigenschutz-Rolle)
 * erreichbar ist. Das DTO trägt absichtlich keine fachlichen Felder — Epic
 * 2+ ersetzt den Aufruf durch die echten fachlichen Queries (Dashboard,
 * Gefährdungsbeurteilung etc.).
 */
export class EigenschutzHealthDto {
  @ApiProperty({
    description: 'Modul-Status — `ready`, solange der Controller gemountet ist und die Guard-Kette durchlaufen wurde.',
    enum: ['ready'],
    example: 'ready',
  })
  status!: 'ready';
}
