import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Response-DTO fuer einen BefehlsgeberVorschlag. */
export class BefehlsgeberVorschlagDto {
  @ApiProperty({ description: 'Eindeutige ID' })
  id!: string;

  @ApiProperty({ description: 'Kuerzel (z.B. EL, ZF)', example: 'EL' })
  kuerzel!: string;

  @ApiProperty({ description: 'Anzeige-Label', example: 'EL (Einsatzleiter)' })
  label!: string;

  @ApiProperty({ description: 'Ob der Vorschlag aktiv ist' })
  istAktiv!: boolean;

  @ApiProperty({ description: 'Sortierreihenfolge' })
  sortOrder!: number;

  @ApiProperty({ description: 'Erstellungszeitpunkt' })
  createdAt!: Date;

  @ApiProperty({ description: 'Letzte Aktualisierung' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Ersteller User-ID' })
  createdBy!: string;

  @ApiPropertyOptional({ description: 'Letzter Bearbeiter User-ID' })
  updatedBy?: string;
}
