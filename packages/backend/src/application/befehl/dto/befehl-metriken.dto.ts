import { ApiProperty } from '@nestjs/swagger';

/**
 * Metriken fuer einen einzelnen Einsatz im Befehlsmanagement.
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 */
export class EinsatzMetrikDto {
  @ApiProperty({ description: 'Einsatz-ID' })
  einsatzId!: string;

  @ApiProperty({ description: 'Alarmstichwort des Einsatzes' })
  alarmstichwort!: string;

  @ApiProperty({ description: 'Datum des Einsatzes (createdAt)' })
  datum!: Date;

  @ApiProperty({ description: 'Anzahl der Befehle im Einsatz' })
  befehlAnzahl!: number;

  @ApiProperty({ type: Number, description: 'Median der Erfassungszeit in Sekunden (erteiltAm → zugestelltAm)', nullable: true })
  erfassungszeitMedianSekunden!: number | null;

  @ApiProperty({ type: Number, description: 'Median der Quittierungszeit in Sekunden (zugestelltAm → quittiertAm)', nullable: true })
  quittierungszeitMedianSekunden!: number | null;

  @ApiProperty({ description: 'Dokumentationsqualitaet in Prozent (Anteil Befehle bei denen alle Empfaenger quittiert haben)' })
  dokumentationsqualitaetProzent!: number;
}

/**
 * Aggregierte Befehlsmetriken ueber alle Einsaetze im Zeitraum.
 *
 * **Story 4.5: Adoptionsmetriken & Dokumentationsqualitaet-Dashboard**
 *
 * **Metriken:**
 * - Erfassungszeit: Median der Zeit von erteiltAm bis zugestelltAm
 * - Quittierungszeit: Median der Zeit von zugestelltAm bis quittiertAm
 * - Papier-Rueckfallquote: Anteil Einsaetze ohne digitale Befehle
 * - Adoptionsrate: Anteil Einsaetze mit mindestens einem digitalen Befehl
 * - Dokumentationsqualitaet: Anteil Befehle bei denen ALLE Empfaenger quittiert haben (AC6)
 */
export class BefehlMetrikenDto {
  @ApiProperty({ type: Number, description: 'Median der Erfassungszeit in Sekunden (global)', nullable: true })
  erfassungszeitMedianSekunden!: number | null;

  @ApiProperty({ type: Number, description: 'Median der Quittierungszeit in Sekunden (global)', nullable: true })
  quittierungszeitMedianSekunden!: number | null;

  @ApiProperty({ description: 'Papier-Rueckfallquote in Prozent (Einsaetze ohne digitale Befehle)' })
  papierRueckfallquoteProzent!: number;

  @ApiProperty({ description: 'Adoptionsrate in Prozent (Einsaetze mit mindestens einem Befehl)' })
  adoptionsrateProzent!: number;

  @ApiProperty({ description: 'Dokumentationsqualitaet in Prozent (Anteil Befehle mit vollstaendiger Quittierung)' })
  dokumentationsqualitaetProzent!: number;

  @ApiProperty({ description: 'Gesamtanzahl Einsaetze im Zeitraum' })
  gesamtEinsaetze!: number;

  @ApiProperty({ description: 'Anzahl Einsaetze mit mindestens einem Befehl' })
  einsaetzeMitBefehlen!: number;

  @ApiProperty({ description: 'Gesamtanzahl Befehle im Zeitraum' })
  gesamtBefehle!: number;

  @ApiProperty({ description: 'Start des Zeitraums' })
  vonDatum!: Date;

  @ApiProperty({ description: 'Ende des Zeitraums' })
  bisDatum!: Date;

  @ApiProperty({ type: [EinsatzMetrikDto], description: 'Pro-Einsatz-Breakdown der Metriken' })
  einsatzDetails!: EinsatzMetrikDto[];
}
