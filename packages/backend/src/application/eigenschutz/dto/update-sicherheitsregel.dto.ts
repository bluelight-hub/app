import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

/**
 * Request-DTO für `PUT /einsatz/:einsatzId/sicherheitsregeln/:id` (Story 2.6 AC3).
 *
 * Analog zu {@link CreateSicherheitsregelDto}, zusätzlich mit `expectedVersion`
 * als Optimistic-Concurrency-Token. Mismatch liefert HTTP 409 (Sentinel
 * `ConflictDetected:Sicherheitsregel:current=<n>`); identische Werte ohne
 * Änderung liefern HTTP 422 (`BusinessRule:NoChangesDetected`).
 *
 * Re-Wire-Semantik (AC4): ändert sich die Ziel-Zuordnung (z. B. „war Einheit A",
 * jetzt „Einheiten B + C"), kündigt der Handler die alte Row ab und legt für
 * jede neue Einheit eine frische Row mit der ursprünglichen
 * `propagationGroupId` an. Client sieht diese Semantik nicht — er übergibt nur
 * das neue Ziel-Set.
 */
export class UpdateSicherheitsregelDto {
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
  @ValidateIf((o: UpdateSicherheitsregelDto) => o.einsatzweit === false)
  @IsArray({ message: 'einheitIds muss ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens eine Einheit muss ausgewählt werden' })
  @IsString({ each: true, message: 'einheitIds-Einträge müssen Text sein' })
  @Matches(/^[a-z][a-z0-9]{23,31}$/, { each: true, message: 'einheitIds-Einträge müssen gültige CUIDs sein' })
  @IsOptional()
  einheitIds?: string[];

  @ApiProperty({ description: 'Aktuelle Aggregate-Version aus dem GET-Response (OCC-Token, 1 ≤ n ≤ 2 000 000 000)' })
  @IsInt({ message: 'expectedVersion muss eine Ganzzahl sein' })
  @Min(1, { message: 'expectedVersion muss ≥ 1 sein' })
  @Max(2_000_000_000, { message: 'expectedVersion ist außerhalb des erwarteten Bereichs' })
  expectedVersion!: number;
}
