import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für die taktische Stärke-Anzeige.
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Zeigt die Kräfte-Verteilung nach Kategorien im Format:
 * "Führung/Unterführung/Mannschaft/Gesamt" (z.B. "2/4/18/24")
 *
 * **Kategorien:**
 * - Führung: Einsatzleiter, LNA, OrgL, Zugführer, Ärzte
 * - Unterführung: Gruppenführer, Truppführer
 * - Mannschaft: Alle anderen Helfer
 * - Gesamt: Summe aller Kategorien
 */
export class TaktischeStaerkeDto {
  /**
   * Anzahl Führungskräfte (Leiter, LNA, OrgL, Zugführer, Ärzte).
   *
   * @example 3
   */
  @ApiProperty({
    description: 'Anzahl Führungskräfte (Leiter, LNA, OrgL, Zugführer, Ärzte)',
    example: 3,
    minimum: 0,
  })
  fuehrung!: number;

  /**
   * Anzahl Unterführer (Gruppenführer, Truppführer).
   *
   * @example 4
   */
  @ApiProperty({
    description: 'Anzahl Unterführer (Gruppenführer, Truppführer)',
    example: 4,
    minimum: 0,
  })
  unterfuehrung!: number;

  /**
   * Anzahl Mannschaftsmitglieder (alle anderen Helfer).
   *
   * @example 18
   */
  @ApiProperty({
    description: 'Anzahl Mannschaftsmitglieder (alle anderen Helfer)',
    example: 18,
    minimum: 0,
  })
  mannschaft!: number;

  /**
   * Gesamtanzahl aller eingesetzten Kräfte.
   *
   * @example 25
   */
  @ApiProperty({
    description: 'Gesamtanzahl aller eingesetzten Kräfte',
    example: 25,
    minimum: 0,
  })
  gesamt!: number;
}
