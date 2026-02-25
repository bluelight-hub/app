import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO fuer aktive Einsatz-Teilnehmer API Responses.
 *
 * Wird verwendet fuer:
 * - GET /einsatz/:einsatzId/teilnehmer (Liste aktiver Teilnehmer)
 *
 * **Story 3.3 AC1:**
 * - Auswahl fuer "Zuweisen an" Feld bei Erinnerung-Erstellung
 * - Filter: Nur aktive Teilnehmer (leftAt === null)
 *
 * **Felder:**
 * - userId: Eindeutige User-ID fuer Zuweisung
 * - username: Anzeigename des Users
 * - personVorname/personNachname: Name der verknuepften EinsatzPerson
 * - personFunkrufname: Funkrufname der verknuepften Person (optional)
 * - personFunktion: Funktion der verknuepften Person
 * - joinedAt: Zeitpunkt des Einsatz-Beitritts
 */
export class AktiveTeilnehmerResponseDto {
  @ApiProperty({
    description: 'Eindeutige User-ID (CUID2)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  userId!: string;

  @ApiProperty({
    description: 'Username des Teilnehmers',
    example: 'tschmidt',
  })
  username!: string;

  @ApiProperty({
    description: 'Vorname der verknuepften EinsatzPerson',
    example: 'Thomas',
  })
  personVorname!: string;

  @ApiProperty({
    description: 'Nachname der verknuepften EinsatzPerson',
    example: 'Schmidt',
  })
  personNachname!: string;

  @ApiPropertyOptional({
    description: 'Funkrufname der verknuepften EinsatzPerson',
    example: 'Florian 11/40',
    nullable: true,
  })
  personFunkrufname?: string | null;

  @ApiProperty({
    description: 'Funktion der verknuepften EinsatzPerson',
    example: 'Gruppenführer',
  })
  personFunktion!: string;

  @ApiProperty({
    description: 'Zeitpunkt des Einsatz-Beitritts (ISO-8601)',
    example: '2026-01-23T08:00:00.000Z',
  })
  joinedAt!: string;
}
