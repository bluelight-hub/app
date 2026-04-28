import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * Request-Body für `POST /psa-profile/propagation-groups/:propagationGroupId/quittieren`
 * (Story 3.4 AC7).
 *
 * Granularität: Quittiert wird die gesamte Bekanntgabe-Gruppe — die
 * `propagationGroupId` kommt aus dem Pfad-Parameter, der Body trägt nur
 * die quittierende Einheit. Pattern: `AckSicherheitsregelDto`.
 */
export class AckPsaQuittungDto {
  /**
   * Konkrete Einheit, die die PSA-Bekanntgabe quittiert. Auch bei einer
   * Bulk-Bekanntgabe an mehrere Einheiten quittiert jede Einheit getrennt
   * — pro Empfänger genau eine Quittung.
   */
  @ApiProperty({
    description: 'cuid2 der Einheit, die die Bekanntgabe quittiert.',
    example: 'clw3h8x9y0000qwertyui00050',
  })
  @IsString()
  // Obergrenze 32 Zeichen (cuid2 ist 24 Zeichen lang; 32 deckt zukünftige
  // Längen-Erweiterungen + cuid v1 Legacy-Edge-Cases ab) — verhindert
  // DoS-Vektor durch beliebig lange Strings, die `/^[a-z0-9]{20,}$/`
  // ohne obere Schranke passieren ließe.
  @Matches(/^[a-z0-9]{20,32}$/, { message: 'einheitId muss ein gültiger cuid2 sein' })
  einheitId!: string;
}
