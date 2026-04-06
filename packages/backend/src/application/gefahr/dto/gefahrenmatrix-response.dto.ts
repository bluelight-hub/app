import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für eine einzelne Gefahrenmatrix-Bewertung.
 */
export class GefahrenmatrixBewertungDto {
  @ApiProperty({ description: 'ID der Bewertung' })
  id!: string;

  @ApiProperty({ description: 'Gefahrentyp (ATEMGIFTE, ANGSTREAKTION, etc.)' })
  gefahrentyp!: string;

  @ApiProperty({ description: 'Schutzobjekt (MENSCHEN, TIERE, UMWELT, SACHWERTE, EINSATZKRAEFTE)' })
  schutzobjekt!: string;

  @ApiProperty({ description: 'Warnstufe (KEINE, NIEDRIG, MITTEL, HOCH, AKUT)' })
  warnstufe!: string;

  @ApiProperty({ description: 'Optionale Beschreibung', required: false, nullable: true })
  beschreibung!: string | null;

  @ApiProperty({ description: 'Wer die Gefahr gemeldet hat', required: false, nullable: true })
  gemeldetVon!: string | null;

  @ApiProperty({ description: 'Zeitpunkt der letzten Aktualisierung' })
  updatedAt!: Date;
}

/**
 * DTO für die komplette Gefahrenmatrix eines Einsatzes.
 */
export class GefahrenmatrixResponseDto {
  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ type: [GefahrenmatrixBewertungDto], description: 'Alle Bewertungen (nur Zellen mit Warnstufe != KEINE)' })
  bewertungen!: GefahrenmatrixBewertungDto[];
}
