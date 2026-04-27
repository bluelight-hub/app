import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

/**
 * Request-DTO für `POST /einsatz/:einsatzId/sicherheitsregeln` (Story 2.6 AC2).
 *
 * Validierung ist absichtlich klassenbasiert (class-validator), konsistent mit
 * den anderen Backend-DTOs. Die semantischen Constraints spiegeln das Shared-
 * Zod-Schema `SicherheitsregelCreateSchemaV1` aus
 * `packages/shared/src/schemas/eigenschutz/sicherheitsregel.schema.ts`
 * (AC8: Single-Source-of-Truth bei der *Semantik*, bis die Backend-ESM-
 * Migration die direkten Zod-Imports erlaubt — identische Grenzwerte).
 *
 * Zuordnung erfolgt als diskriminierte Struktur:
 * - `einsatzweit: true` → keine `einheitIds` zulässig (Server ignoriert evtl.
 *   übergebene Werte; Controller-Mapping erzwingt `null` auf Domain-Ebene).
 * - `einsatzweit: false` → `einheitIds` mit mindestens einem Eintrag; jede
 *   ID im CUID-Format.
 */
export class CreateSicherheitsregelDto {
  @ApiProperty({ description: 'Titel der Regel (1–80 Zeichen, getrimmt)', minLength: 1, maxLength: 80 })
  @IsString({ message: 'titel muss ein Text sein' })
  @IsNotEmpty({ message: 'titel ist erforderlich' })
  @MinLength(1, { message: 'titel darf nicht leer sein' })
  @MaxLength(80, { message: 'titel darf maximal 80 Zeichen lang sein' })
  titel!: string;

  @ApiProperty({ description: 'Inhalt der Regel (1–2000 Zeichen, Plain-Text, getrimmt)', minLength: 1, maxLength: 2000 })
  @IsString({ message: 'inhalt muss ein Text sein' })
  @IsNotEmpty({ message: 'inhalt ist erforderlich' })
  @MinLength(1, { message: 'inhalt darf nicht leer sein' })
  @MaxLength(2000, { message: 'inhalt darf maximal 2000 Zeichen lang sein' })
  inhalt!: string;

  @ApiProperty({ description: '`true` = Regel gilt einsatzweit (keine Einheit); `false` = Zuordnung über `einheitIds`' })
  @IsBoolean({ message: 'einsatzweit muss ein Boolean sein' })
  einsatzweit!: boolean;

  @ApiPropertyOptional({
    description: 'Liste der CUIDs der zugeordneten Einsatzeinheiten (mindestens eine, wenn `einsatzweit === false`). Bei `einsatzweit === true` ignoriert.',
    type: [String],
    minItems: 1,
  })
  @ValidateIf((o: CreateSicherheitsregelDto) => o.einsatzweit === false)
  @IsArray({ message: 'einheitIds muss ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens eine Einheit muss ausgewählt werden' })
  @IsString({ each: true, message: 'einheitIds-Einträge müssen Text sein' })
  @Matches(/^[a-z][a-z0-9]{23,31}$/, { each: true, message: 'einheitIds-Einträge müssen gültige CUIDs sein' })
  @IsOptional()
  einheitIds?: string[];
}
