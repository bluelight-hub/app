import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BefehlsgeberQuelle {
  VORSCHLAG = 'VORSCHLAG',
  EINSATZ_PERSON = 'EINSATZ_PERSON',
}

/** Ergebnis-DTO fuer die Befehlsgeber-Suche. */
export class BefehlsgeberSucheResultDto {
  @ApiProperty({ description: 'ID (Vorschlag-ID oder EinsatzPerson-ID)' })
  id!: string;

  @ApiProperty({ description: 'Anzeige-Name (Kuerzel oder Nachname, Vorname)', example: 'EL' })
  name!: string;

  @ApiProperty({ description: 'Volles Label (Label oder Nachname, Vorname (Funktion))', example: 'EL (Einsatzleiter)' })
  label!: string;

  @ApiPropertyOptional({ description: 'User-ID (nur bei EINSATZ_PERSON, fuer befehlsgeberId)' })
  userId?: string;

  @ApiProperty({ enum: BefehlsgeberQuelle, description: 'Quelle des Ergebnisses' })
  quelle!: BefehlsgeberQuelle;
}
