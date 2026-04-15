import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ZEITPUNKT_FELDER, type ZeitpunktFeld } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';

/**
 * Request-DTO zum manuellen Nachtragen oder Korrigieren eines Zeitpunkts
 * (`ausgeruecktAm`, `vorOrtAm` oder `wiederFreiAm`) eines Empfängers.
 *
 * `wert = null` löscht einen vorher gesetzten Zeitpunkt — dies wird vom
 * Aggregat als Audit-relevanter Vorgang behandelt.
 */
export class KorrigiereZeitpunktDto {
  @ApiProperty({ enum: ZEITPUNKT_FELDER, example: 'vorOrtAm', description: 'Welches Zeitpunkt-Feld korrigiert werden soll' })
  @IsIn(ZEITPUNKT_FELDER as readonly string[])
  feld!: ZeitpunktFeld;

  @ApiPropertyOptional({
    description: 'Neuer Wert; `null` löscht einen bestehenden Eintrag.',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  wert!: Date | string | null;
}
