import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für erfolgreiche Einheit-Erstellung.
 *
 * Wird zurückgegeben nach POST /einsaetze/:einsatzId/einheiten
 */
export class EinheitCreatedResponseDto {
  @ApiProperty({
    description: 'ID der neu erstellten EinsatzEinheit',
    type: String,
    format: 'cuid2',
    example: 'clx1234567890abcdef12345',
  })
  id!: string;
}
