import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO für erfolgreiche Person-Registrierung.
 *
 * Wird zurückgegeben nach POST /einsaetze/:einsatzId/personen
 * und POST /einsaetze/:einsatzId/personen/qr
 */
export class PersonRegisteredResponseDto {
  @ApiProperty({
    description: 'ID der neu erstellten EinsatzPerson',
    type: String,
    format: 'cuid2',
    example: 'clx1234567890abcdef12345',
  })
  id!: string;
}
