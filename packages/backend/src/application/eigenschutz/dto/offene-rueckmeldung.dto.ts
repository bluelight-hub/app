import { ApiProperty } from '@nestjs/swagger';

/**
 * Eine offene Ausrüstungs-Lücken-Rückmeldung für das einsatzweite
 * Eigenschutz-Seitenpanel.
 */
export class OffeneRueckmeldungDto {
  @ApiProperty({ description: 'cuid2 der PSA-Bekanntgabe-Gruppe.', example: 'clw3h8x9y0000qwertyuipgrp01' })
  propagationGroupId!: string;

  @ApiProperty({ description: 'cuid2 des Einsatzes.', example: 'clw3h8x9y0000qwertyui00002' })
  einsatzId!: string;

  @ApiProperty({ description: 'cuid2 der meldenden Einheit.', example: 'clw3h8x9y0000qwertyui00050' })
  einheitId!: string;

  @ApiProperty({
    description: 'Gemeldete Ausrüstungs-Lücke. Kann für Legacy-Daten null sein, obwohl lueckeGemeldet=true ist.',
    type: String,
    nullable: true,
    example: 'Schutzanzug Größe L fehlt.',
  })
  lueckeNotiz!: string | null;

  /**
   * MVP-Zeitsemantik: Es gibt keine separate `luecke_gemeldet_am`-Spalte.
   * Deshalb entspricht `gemeldetAm` der ursprünglichen `quittiertAm`-Zeit der
   * PsaProfilQuittung. Der Update-Pfad für Lücken überschreibt `quittiertAm`
   * bewusst nicht.
   */
  @ApiProperty({
    description: 'ISO-DateTime der Meldung; im MVP aus PsaProfilQuittung.quittiertAm abgeleitet.',
    example: '2026-05-08T09:42:13.000Z',
  })
  gemeldetAm!: string;

  @ApiProperty({
    description: 'Optionaler Begründungs-Anriss aus der zugehörigen PSA-Bekanntgabe, wenn aus Outbox-Daten ableitbar.',
    type: String,
    nullable: true,
    required: false,
    example: 'CBRN-Lage gemeldet, FFP3 für Eingreif-Trupps anziehen.',
  })
  begruendungAnriss?: string | null;
}
