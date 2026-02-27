import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Datenquelle fuer Empfaenger-Suchergebnisse */
export enum EmpfaengerQuelle {
  EINSATZ = 'EINSATZ',
  STAMMDATEN = 'STAMMDATEN',
}

/**
 * Response-DTO fuer Empfaenger-Suchergebnisse.
 *
 * Liefert passende Personen aus EinsatzPerson und StammPerson
 * fuer die Empfaenger-Auswahl bei der Befehlserstellung.
 */
export class EmpfaengerSucheResultDto {
  @ApiProperty({ description: 'Person-ID (EinsatzPerson oder StammPerson ID)', example: 'clw3h...' })
  id!: string;

  @ApiProperty({ description: 'Anzeigename (Nachname, Vorname oder Funkrufname)', example: 'ZF Meier' })
  name!: string;

  @ApiPropertyOptional({ description: 'Funktion/Rolle im Einsatz', example: 'Gruppenführer' })
  rolle?: string;

  @ApiPropertyOptional({ description: 'Qualifikation', example: 'Sanitätshelfer' })
  qualifikation?: string;

  /** Verknuepfter User-ID, aufgeloest via EinsatzTeilnehmer-Mapping (fuer In-App-Quittierung). */
  @ApiPropertyOptional({ description: 'Verknuepfter User-ID (fuer In-App-Quittierung)' })
  userId?: string;

  @ApiProperty({ description: 'Datenquelle', enum: EmpfaengerQuelle, example: EmpfaengerQuelle.EINSATZ })
  quelle!: EmpfaengerQuelle;
}
