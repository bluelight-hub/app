import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EinsatzEinheitDto } from './einsatz-einheit.dto';

/**
 * DTO für eine Person innerhalb einer Einheit (vereinfacht).
 *
 * Enthält nur die wichtigsten Felder für die Darstellung
 * in der Einheiten-Detailansicht.
 */
export class EinsatzEinheitPersonDto {
  @ApiProperty({
    description: 'EinsatzPerson ID (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({
    description: 'Vorname der Person',
    example: 'Max',
  })
  vorname!: string;

  @ApiProperty({
    description: 'Nachname der Person',
    example: 'Mustermann',
  })
  nachname!: string;

  @ApiProperty({
    description: 'Funktion der Person in der Einheit',
    example: 'Rettungshelfer',
  })
  funktion!: string;

  @ApiPropertyOptional({
    description: 'Funkrufname der Person',
    example: 'Florian Heidelberg 1',
    nullable: true,
  })
  funkrufname!: string | null;
}

/**
 * Detail-Response DTO für EinsatzEinheit.
 *
 * Erweitert das Basis-DTO um zugewiesene Personen und den Einheitenführer.
 * Wird für die Detailansicht einer einzelnen Einheit verwendet.
 */
export class EinsatzEinheitDetailsDto extends EinsatzEinheitDto {
  @ApiProperty({
    description: 'Zugewiesene Personen der Einheit',
    type: () => [EinsatzEinheitPersonDto],
  })
  personen!: EinsatzEinheitPersonDto[];

  @ApiPropertyOptional({
    description: 'Einheitenführer (aufgelöste Person), null wenn nicht besetzt',
    type: () => EinsatzEinheitPersonDto,
    nullable: true,
  })
  einheitenfuehrer!: EinsatzEinheitPersonDto | null;
}
