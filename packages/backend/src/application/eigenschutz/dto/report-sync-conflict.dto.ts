import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { IsCuid } from '@/modules/common/decorators/is-cuid.decorator';

/**
 * Request-Body für `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts`
 * (Story 3.9 AC5, FR50, Architektur §B6).
 *
 * **Vertragspunkte:**
 * - `entityId`: cuid2 der konfliktierenden `PsaProfilZuweisung`-Row.
 * - `fieldPath`: für PSA-Profil konstant `'profil'` (Story 3.9 strikt).
 * - `localPayload`: UI-Repräsentation des Verlierer-State; Server-Cap 4 KiB
 *   serialisiert (Repository + Outbox-Serializer als Defense-in-Depth).
 * - `serverVersion` und `localExpectedVersion`: 409-Body-Echo aus
 *   `context.currentVersion` und `context.attemptedVersion`. Server validiert
 *   `serverVersion > localExpectedVersion`.
 */
export class ReportSyncConflictDto {
  @ApiProperty({
    description: 'cuid2 der Einheit (für PSA-Profil-Konflikte immer gesetzt).',
    required: false,
    example: 'clw3h8x9y0000qwertyui00050',
  })
  @IsOptional()
  @IsCuid()
  einheitId?: string;

  @ApiProperty({
    description: 'cuid2 der konfliktierenden PsaProfilZuweisung-Row (aus 409-Body context.zuweisungId).',
    example: 'clw3h8x9y0000qwertyuiloser1',
  })
  @IsCuid()
  entityId!: string;

  @ApiProperty({
    description: 'Pfad innerhalb der Entity. Story 3.9 für PSA-Profil immer "profil".',
    minLength: 1,
    maxLength: 200,
    example: 'profil',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fieldPath!: string;

  @ApiProperty({
    description: 'Verlierer-State (Toggle-Set, Begründung, etc.). Server-Cap: 4 KiB serialisiert.',
    type: Object,
  })
  @IsObject()
  localPayload!: Record<string, unknown>;

  @ApiProperty({ description: 'Server-Version laut 409-Body context.currentVersion.', minimum: 1 })
  @IsInt()
  @Min(1)
  serverVersion!: number;

  @ApiProperty({ description: 'Lokal erwartete Version (= expectedVersion im Original-Command).', minimum: 1 })
  @IsInt()
  @Min(1)
  localExpectedVersion!: number;
}
