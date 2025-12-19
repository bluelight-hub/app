import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

/**
 * DTO für Person-Registrierung im Einsatz.
 *
 * **Zwei Modi:**
 * 1. Mit stammPersonId: Autocomplete-Auswahl aus Stammdaten (KOPIERT Daten)
 * 2. Ohne stammPersonId: Manuelle Eingabe (temporäre Person, stammId = undefined)
 *
 * **Snapshot-Semantik (Story 4-0):**
 * - Bei Mode 1: vorname, nachname, funkrufname werden KOPIERT (nicht referenziert)
 * - Änderungen an StammPerson beeinflussen EinsatzPerson NICHT
 * - stammPersonId dient als Referenz für Tracking
 *
 * **Story 4-1 AC1 (Autocomplete-Modus):**
 * - stammPersonId ist gesetzt → Backend KOPIERT Daten aus StammPerson
 * - User kann vorname/nachname überschreiben (für abweichende Schreibweise)
 *
 * **Story 4-1 AC2 (Manueller Modus):**
 * - stammPersonId ist undefined → User gibt alle Felder manuell ein
 */
export class RegistrierePersonDto {
  @ApiPropertyOptional({
    description: 'StammPerson ID (optional für Autocomplete-Auswahl)',
    example: 'clw3h8ijk7l8m9nop0qr',
  })
  @IsOptional()
  @IsString()
  stammPersonId?: string;

  @ApiProperty({
    description: 'Vorname der Person (1-100 Zeichen)',
    example: 'Max',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  vorname!: string;

  @ApiProperty({
    description: 'Nachname der Person (1-100 Zeichen)',
    example: 'Mustermann',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  nachname!: string;

  @ApiProperty({
    description: 'Funktion/Rolle im Einsatz (max 50 Zeichen)',
    example: 'Rettungshelfer',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  funktion!: string;

  @ApiPropertyOptional({
    description: 'Funkrufname (optional, max 50 Zeichen)',
    example: 'Florian Heidelberg 1',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  funkrufname?: string;

  @ApiPropertyOptional({
    description: 'Qualifikation IDs (CUID2 Array)',
    type: [String],
    example: ['clw3h8ijk7l8m9nop0qr', 'clw4i9jkl8m9n0opq1rs'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualifikationIds?: string[];
}
