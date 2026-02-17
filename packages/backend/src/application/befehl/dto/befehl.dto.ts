import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BefehlEmpfaengerDto } from './befehl-empfaenger.dto';
import { BefehlKommentarDto } from './befehl-kommentar.dto';

/**
 * Erlaubte Befehl-Status Werte fuer API-Responses.
 */
export type BefehlStatusType = 'ERTEILT' | 'ZUGESTELLT' | 'QUITTIERT' | 'KORRIGIERT';

/**
 * Erlaubte Befehlstyp Werte fuer API-Responses (computed, nicht persistiert).
 */
export type BefehlstypType = 'KURZBEFEHL' | 'EAMZW' | 'ERWEITERT';

/**
 * DTO fuer Befehl-Daten in API-Responses.
 *
 * Trennt Domain-Schicht (Befehl Aggregate) von API-Schicht.
 * Enthaelt nur die fuer API-Consumers relevanten Felder.
 *
 * **Warum separate DTO-Klasse:**
 * - Swagger Decorators sind API-Concern
 * - Ermoeglicht API-Versionierung ohne Domain-Aenderungen
 * - Value Objects werden auf primitive Typen gemappt
 * - Security: Interne Domain-Details (Events) bleiben verborgen
 */
export class BefehlDto {
  @ApiProperty({ description: 'Befehl-ID', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Befehlsnummer (Format: B{YEAR}-{CUID-8})', example: 'B2026-abc123xy' })
  nummer!: string;

  @ApiProperty({ description: 'Einsatz-ID', example: 'clw3h8x9y0010qwertyuiopas' })
  einsatzId!: string;

  @ApiProperty({ description: 'Auftrag', example: 'Patientenablage einrichten' })
  auftrag!: string;

  @ApiProperty({ description: 'Befehlsgeber User-ID', example: 'clw3h8x9y0003qwertyuiopas' })
  befehlsgeberId!: string;

  @ApiProperty({ description: 'Ersteller User-ID', example: 'clw3h8x9y0004qwertyuiopas' })
  erstellerId!: string;

  @ApiProperty({
    description: 'Befehlsstatus',
    enum: ['ERTEILT', 'ZUGESTELLT', 'QUITTIERT', 'KORRIGIERT'],
    example: 'ERTEILT',
  })
  status!: BefehlStatusType;

  @ApiProperty({
    description: 'Befehlstyp (computed aus EAMZW-Feldern)',
    enum: ['KURZBEFEHL', 'EAMZW', 'ERWEITERT'],
    example: 'KURZBEFEHL',
  })
  befehlstyp!: BefehlstypType;

  @ApiPropertyOptional({ description: 'Zeitvorgabe', example: '15 min' })
  zeitvorgabe?: string;

  @ApiPropertyOptional({ description: 'Ereignis (EAMZW)', example: 'Wohnungsbrand im 2. OG' })
  ereignis?: string;

  @ApiPropertyOptional({ description: 'Mittel (EAMZW)', example: '2 Loeschzuege' })
  mittel?: string;

  @ApiPropertyOptional({ description: 'Ziel (EAMZW)', example: 'Brandbekaempfung' })
  ziel?: string;

  @ApiPropertyOptional({ description: 'Weg (EAMZW)', example: 'Ueber Haupteingang' })
  weg?: string;

  @ApiProperty({ description: 'Erteilungs-Zeitpunkt', example: '2024-01-15T10:30:00.000Z' })
  erteiltAm!: Date;

  @ApiProperty({ description: 'Empfaenger-Liste', type: () => [BefehlEmpfaengerDto] })
  empfaenger!: BefehlEmpfaengerDto[];

  @ApiProperty({ description: 'Kommentar-Liste', type: () => [BefehlKommentarDto] })
  kommentare!: BefehlKommentarDto[];

  @ApiProperty({ description: 'Erstellungszeitpunkt', example: '2024-01-15T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Letzter Aenderungszeitpunkt', example: '2024-01-15T10:30:00.000Z' })
  updatedAt!: Date;
}
