import { ApiProperty } from '@nestjs/swagger';

export class RufnameVorschlagFahrzeugDto {
  @ApiProperty({ example: 'clfz123...', description: 'Einsatz-Fahrzeug-ID' })
  id!: string;

  @ApiProperty({ example: 'Florian Mainz 12-1', description: 'Funkrufname' })
  funkrufname!: string;
}

export class RufnameVorschlagPersonDto {
  @ApiProperty({ example: 'clp123...', description: 'Einsatz-Person-ID' })
  id!: string;

  @ApiProperty({ example: 'Mustermann, Max', description: 'Funkrufname (Fallback vorname + nachname, wenn nicht gesetzt)' })
  funkrufname!: string;
}

export class RufnameVorschlagEinheitDto {
  @ApiProperty({ example: 'cle123...', description: 'Einsatz-Einheits-ID' })
  id!: string;

  @ApiProperty({ example: 'Einsatzabschnitt Nord', description: 'Einheitenname' })
  name!: string;
}

/**
 * Response-Hülle: gebündelte Rufnamen-Vorschläge für die Zuordnungs-UI.
 */
export class RufnameVorschlaegeResponseDto {
  @ApiProperty({ type: () => [RufnameVorschlagFahrzeugDto] })
  fahrzeuge!: RufnameVorschlagFahrzeugDto[];

  @ApiProperty({ type: () => [RufnameVorschlagPersonDto] })
  personen!: RufnameVorschlagPersonDto[];

  @ApiProperty({ type: () => [RufnameVorschlagEinheitDto] })
  einheiten!: RufnameVorschlagEinheitDto[];
}
