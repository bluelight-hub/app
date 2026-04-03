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
 * DTO für eine Person aus der Fahrzeug-Besatzung einer Einheit.
 *
 * Enthält die Person-Daten plus den Funkrufnamen des zugewiesenen Fahrzeugs.
 * Diese Personen sind implizit der Einheit zugeordnet (über ihr Fahrzeug)
 * und können nicht einzeln entfernt werden.
 */
export class EinsatzEinheitFahrzeugPersonDto {
  @ApiProperty({
    description: 'EinsatzPerson ID (CUID2)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  id!: string;

  @ApiProperty({ description: 'Vorname der Person', example: 'Max' })
  vorname!: string;

  @ApiProperty({ description: 'Nachname der Person', example: 'Mustermann' })
  nachname!: string;

  @ApiProperty({ description: 'Funktion der Person', example: 'Rettungshelfer' })
  funktion!: string;

  @ApiPropertyOptional({ description: 'Funkrufname der Person', nullable: true })
  funkrufname!: string | null;

  @ApiProperty({
    description: 'Funkrufname des Fahrzeugs, dem die Person als Besatzung zugewiesen ist',
    example: 'Florian Heidelberg 43/1',
  })
  fahrzeugFunkrufname!: string;
}

/**
 * Detail-Response DTO für EinsatzEinheit.
 *
 * Erweitert das Basis-DTO um zugewiesene Personen, Fahrzeug-Besatzung und den Einheitenführer.
 * Wird für die Detailansicht einer einzelnen Einheit verwendet.
 */
export class EinsatzEinheitDetailsDto extends EinsatzEinheitDto {
  @ApiProperty({
    description: 'Explizit zugewiesene Personen der Einheit',
    type: () => [EinsatzEinheitPersonDto],
  })
  personen!: EinsatzEinheitPersonDto[];

  @ApiProperty({
    description: 'Implizit zugewiesene Personen über Fahrzeug-Besatzung (nicht einzeln entfernbar)',
    type: () => [EinsatzEinheitFahrzeugPersonDto],
  })
  fahrzeugPersonen!: EinsatzEinheitFahrzeugPersonDto[];

  @ApiPropertyOptional({
    description: 'Einheitenführer (aufgelöste Person), null wenn nicht besetzt',
    type: () => EinsatzEinheitPersonDto,
    nullable: true,
  })
  einheitenfuehrer!: EinsatzEinheitPersonDto | null;
}
