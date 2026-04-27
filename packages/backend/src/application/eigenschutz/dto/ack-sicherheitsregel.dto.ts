import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

/**
 * Request-Body für `POST /sicherheitsregeln/:id/quittieren` (Story 2.7 AC2).
 *
 * **Konvention:** Spiegelt das Zod-Shared-Schema
 * `AckSicherheitsregelInputSchemaV1` 1:1 wider; Zod hat Vorrang bei Drift.
 * Die class-validator-Decorators existieren primär für die OpenAPI-Generierung
 * und für den Nest-`ValidationPipe`-Boundary.
 */
export class AckSicherheitsregelDto {
  /**
   * Konkrete Einheit, die die Regel quittiert. Auch für einsatzweite Regeln
   * (`Sicherheitsregel.einheitId === null`) muss eine Einheit angegeben
   * werden — Empfänger sind immer einheitenscharf.
   */
  @ApiProperty({
    description: 'cuid2 der Einheit, die die Regel quittiert.',
    example: 'clw3h8x9y0000qwertyui00050',
  })
  @IsString()
  @Matches(/^[a-z0-9]{20,}$/, { message: 'einheitId muss ein gültiger cuid2 sein' })
  einheitId!: string;

  /**
   * Optionaler OCC-Guard: Banner-Version, die der Empfänger gerade vor
   * Augen hat. Wenn die aktuelle DB-Version abweicht, antwortet der Server
   * mit 409 — der Stab hat zwischenzeitlich aktualisiert, der Empfänger
   * muss den neuen Banner sehen, bevor er quittiert.
   */
  @ApiProperty({
    description: 'Optionale erwartete Aggregate-Version (OCC).',
    example: 2,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedRegelVersion?: number;
}
