import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO für die Zeichendefinition eines taktischen Zeichens.
 * Kapselt Grundzeichen und optionale Qualifikationsmerkmale.
 */
export class ZeichenDefinitionDto {
  @ApiProperty({ description: 'Grundzeichen des taktischen Zeichens', example: 'Fahrzeug' })
  grundzeichen!: string;

  @ApiPropertyOptional({ description: 'Organisation (z.B. "Feuerwehr", "THW")', example: 'Feuerwehr' })
  organisation?: string;

  @ApiPropertyOptional({ description: 'Fachaufgabe (z.B. "Brandbekämpfung")', example: 'Brandbekämpfung' })
  fachaufgabe?: string;

  @ApiPropertyOptional({ description: 'Einheit (z.B. "Gruppe", "Zug")', example: 'Gruppe' })
  einheit?: string;

  @ApiPropertyOptional({ description: 'Verwaltungsstufe', example: 'Gemeinde' })
  verwaltungsstufe?: string;

  @ApiPropertyOptional({ description: 'Symbol-Schlüssel für grafische Darstellung', example: 'rtw' })
  symbol?: string;

  @ApiPropertyOptional({ description: 'Textbeschriftung im Symbol', example: 'RTW 1' })
  text?: string;
}

/**
 * Response DTO für ein taktisches Zeichen.
 * Vollständige Darstellung inkl. optionaler Lagekartenposition.
 */
export class TaktischesZeichenResponseDto {
  @ApiProperty({ description: 'Eindeutige ID des taktischen Zeichens', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'ID des zugehörigen Einsatzes', example: 'clw3h8x9y0001qwertyuiopas' })
  einsatzId!: string;

  @ApiProperty({ description: 'Zeichendefinition (Grundzeichen und Qualifikationsmerkmale)', type: ZeichenDefinitionDto })
  zeichenDefinition!: ZeichenDefinitionDto;

  @ApiPropertyOptional({ description: 'Art der verknüpften Ressource (z.B. "EINHEIT", "FAHRZEUG")', example: 'FAHRZEUG' })
  referenzTyp?: string;

  @ApiPropertyOptional({ description: 'ID der verknüpften Ressource', example: 'clw3h8x9y0002qwertyuiopas' })
  referenzId?: string;

  @ApiPropertyOptional({ description: 'WGS84 Breitengrad der Kartenposition', example: 51.5074 })
  lat?: number;

  @ApiPropertyOptional({ description: 'WGS84 Längengrad der Kartenposition', example: -0.1278 })
  lng?: number;

  @ApiPropertyOptional({ description: 'MGRS-Koordinate (Military Grid Reference System)', example: '32UMC1234567890' })
  mgrs?: string;

  @ApiPropertyOptional({ description: 'ID der Lagekarte, auf der das Zeichen platziert ist', example: 'clw3h8x9y0003qwertyuiopas' })
  lagekarteId?: string;

  @ApiPropertyOptional({ description: 'Optionale Beschriftung des Zeichens', example: 'Abschnittsführer' })
  label?: string;

  @ApiPropertyOptional({ description: 'Optionale Notiz/Bemerkung zum Zeichen', example: 'Zuständig für Abschnitt B' })
  notiz?: string;

  @ApiProperty({ description: 'Gibt an ob das Zeichen aus dem Katalog stammt', example: false })
  istAusKatalog!: boolean;

  @ApiPropertyOptional({ description: 'ID des Katalogeintrags (nur wenn istAusKatalog = true)', example: 'clw3h8x9y0004qwertyuiopas' })
  katalogEintragId?: string;

  @ApiProperty({ description: 'Gibt an ob das Zeichen auf einer Lagekarte platziert ist', example: false })
  istPlatziert!: boolean;

  @ApiProperty({ description: 'Erstellungszeitpunkt (ISO-8601)', example: '2026-02-03T15:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ description: 'Erstellt von (User ID)', example: 'clw3h8x9y0005qwertyuiopas' })
  createdBy!: string;

  @ApiProperty({ description: 'Letzter Änderungszeitpunkt (ISO-8601)', example: '2026-02-03T15:30:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ description: 'Zuletzt geändert von (User ID)', example: 'clw3h8x9y0006qwertyuiopas' })
  updatedBy?: string;
}
