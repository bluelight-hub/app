import { ApiProperty } from '@nestjs/swagger';

/**
 * Einzelner Einsatz in der Aufbewahrungsvorschau.
 */
export class AufbewahrungsVorschauEinsatzDto {
  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ description: 'Einsatz-Nummer' })
  einsatzNummer!: string;

  @ApiProperty({ description: 'Anzahl betroffener Befehle' })
  befehlCount!: number;

  @ApiProperty({ description: 'Archivierungsdatum des Einsatzes' })
  archiviertAm!: Date;

  @ApiProperty({ description: 'Voraussichtliches Anonymisierungsdatum' })
  anonymisierungFaelligAm!: Date;
}

/**
 * DTO fuer Aufbewahrungsvorschau in API-Responses.
 *
 * Zeigt welche Einsaetze bei aktueller Konfiguration
 * von Anonymisierung/Loeschung betroffen waeren.
 *
 * @remarks Story 5.5 AC1
 */
export class AufbewahrungsVorschauDto {
  @ApiProperty({ description: 'Betroffene Einsaetze', type: () => [AufbewahrungsVorschauEinsatzDto] })
  einsaetze!: AufbewahrungsVorschauEinsatzDto[];

  @ApiProperty({ description: 'Gesamtanzahl betroffener Befehle' })
  gesamtBefehlCount!: number;
}
