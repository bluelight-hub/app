import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';
import { EINSATZ_PERSON_VALIDATION } from '@domain/kraefte/constants/einsatz-person-validation.constants';

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
    description: `Vorname der Person (${EINSATZ_PERSON_VALIDATION.VORNAME_MIN_LENGTH}-${EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH} Zeichen)`,
    example: 'Max',
    minLength: EINSATZ_PERSON_VALIDATION.VORNAME_MIN_LENGTH,
    maxLength: EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(EINSATZ_PERSON_VALIDATION.VORNAME_MIN_LENGTH)
  @MaxLength(EINSATZ_PERSON_VALIDATION.VORNAME_MAX_LENGTH)
  vorname!: string;

  @ApiProperty({
    description: `Nachname der Person (${EINSATZ_PERSON_VALIDATION.NACHNAME_MIN_LENGTH}-${EINSATZ_PERSON_VALIDATION.NACHNAME_MAX_LENGTH} Zeichen)`,
    example: 'Mustermann',
    minLength: EINSATZ_PERSON_VALIDATION.NACHNAME_MIN_LENGTH,
    maxLength: EINSATZ_PERSON_VALIDATION.NACHNAME_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(EINSATZ_PERSON_VALIDATION.NACHNAME_MIN_LENGTH)
  @MaxLength(EINSATZ_PERSON_VALIDATION.NACHNAME_MAX_LENGTH)
  nachname!: string;

  @ApiProperty({
    description: `Funktion/Rolle im Einsatz (max ${EINSATZ_PERSON_VALIDATION.FUNKTION_MAX_LENGTH} Zeichen)`,
    example: 'Rettungshelfer',
    maxLength: EINSATZ_PERSON_VALIDATION.FUNKTION_MAX_LENGTH,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(EINSATZ_PERSON_VALIDATION.FUNKTION_MAX_LENGTH)
  funktion!: string;

  @ApiPropertyOptional({
    description: `Funkrufname (optional, max ${EINSATZ_PERSON_VALIDATION.FUNKRUFNAME_MAX_LENGTH} Zeichen)`,
    example: 'Florian Heidelberg 1',
    maxLength: EINSATZ_PERSON_VALIDATION.FUNKRUFNAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(EINSATZ_PERSON_VALIDATION.FUNKRUFNAME_MAX_LENGTH)
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
