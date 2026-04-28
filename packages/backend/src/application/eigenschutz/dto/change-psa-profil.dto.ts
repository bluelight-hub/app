import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { IsCuid2 } from '@/modules/common/decorators/is-nanoid.decorator';
import { PsaProfil } from '@/generated/prisma/enums';

/**
 * Maximalzahl der Profil-Toggles in einem Single- oder Bulk-Request.
 * Entspricht der Anzahl der PSA-Profile (BASIS, INFEKTION, CHEMIE, SCHUTZ, …).
 * Wird vom Handler als zweite Verteidigungslinie referenziert, damit DTO und
 * Domain-Validierung ohne Drift übereinstimmen.
 */
export const PSA_PROFIL_TOGGLE_LIMIT = 5;

/**
 * Toggle-Eintrag pro PSA-Profil (Story 3.1).
 *
 * `aktivieren=true` → Aktivierung; `aktivieren=false` → Deaktivierung.
 * `expectedVersion` ist Pflicht für alle Schließ-Pfade (Deaktivierung +
 * Reaktivierung mit Vor-Profil); für reine Aktivierung ohne Vor-Profil
 * darf das Feld weggelassen werden.
 */
export class PsaProfilToggleDto {
  @ApiProperty({ description: 'Eines der 5 PSA-Profile', enum: PsaProfil })
  @IsEnum(PsaProfil, { message: 'profil muss eines der 5 PSA-Profile sein' })
  profil!: (typeof PsaProfil)[keyof typeof PsaProfil];

  @ApiProperty({ description: '`true` = aktivieren; `false` = deaktivieren' })
  @IsBoolean({ message: 'aktivieren muss ein Boolean sein' })
  aktivieren!: boolean;

  @ApiPropertyOptional({
    description: 'Aggregate-Version der bestehenden aktiven Zuweisung. Pflicht für Deaktivieren oder Reaktivieren mit Vor-Profil; bei reiner Aktivierung ignoriert.',
    minimum: 1,
    maximum: 2_147_483_647,
  })
  @IsOptional()
  @IsInt({ message: 'expectedVersion muss eine Ganzzahl sein' })
  @Min(1, { message: 'expectedVersion muss ≥ 1 sein' })
  @Max(2_147_483_647, { message: 'expectedVersion ist außerhalb des erwarteten Bereichs' })
  expectedVersion?: number;
}

/**
 * Request-DTO für `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile/einheiten/:einheitId/change`
 * (Story 3.1 AC1/AC2/AC3).
 *
 * Story-3.1-Scope ist Single-Select: pro Request wird genau eine
 * Einheit (`:einheitId` aus dem Path) geändert. Die `profilToggles`-Liste
 * darf 1–5 Einträge enthalten — jeder Eintrag mappt auf ein PSA-Profil.
 *
 * `begruendung` ist Pflicht (UX-DR — keine kommentarlosen
 * Eigenschutz-Mutationen); 1–500 Zeichen getrimmt.
 */
export class ChangePsaProfilDto {
  @ApiProperty({
    description: `Toggle-Liste — mind. 1 Profil, max. ${PSA_PROFIL_TOGGLE_LIMIT} Profile, kein Duplikat`,
    type: () => PsaProfilToggleDto,
    isArray: true,
    minItems: 1,
    maxItems: PSA_PROFIL_TOGGLE_LIMIT,
  })
  @IsArray({ message: 'profilToggles muss ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens ein Profil-Toggle erforderlich' })
  @ArrayMaxSize(PSA_PROFIL_TOGGLE_LIMIT, { message: `Maximal ${PSA_PROFIL_TOGGLE_LIMIT} Profil-Toggles` })
  @ValidateNested({ each: true })
  @Type(() => PsaProfilToggleDto)
  profilToggles!: PsaProfilToggleDto[];

  @ApiProperty({ description: 'Pflicht-Begründung der Änderung (1–500 Zeichen, getrimmt)', minLength: 1, maxLength: 500 })
  @IsString({ message: 'begruendung muss ein Text sein' })
  @IsNotEmpty({ message: 'begruendung ist erforderlich' })
  @MinLength(1, { message: 'begruendung darf nicht leer sein' })
  @MaxLength(500, { message: 'begruendung darf maximal 500 Zeichen lang sein' })
  begruendung!: string;
}

/**
 * Response-DTO einer einzelnen, durch den Toggle betroffenen Zuweisung.
 *
 * Trägt die `version` für Optimistic-Concurrency-Folge-Aufrufe (Frontend
 * schreibt sie in den nächsten `expectedVersion`-Slot zurück).
 */
export class PsaProfilZuweisungDto {
  @ApiProperty({ description: 'CUID der Zuweisungs-Row' })
  id!: string;

  @ApiProperty({ description: 'CUID des Einsatzes' })
  einsatzId!: string;

  @ApiProperty({ description: 'CUID der Einheit' })
  einheitId!: string;

  @ApiProperty({ description: 'PSA-Profil', enum: PsaProfil })
  profil!: (typeof PsaProfil)[keyof typeof PsaProfil];

  @ApiProperty({ description: 'Beginn der Aktivierung (ISO 8601)' })
  gueltigVon!: string;

  @ApiPropertyOptional({ description: 'Ende der Aktivierung (`null` = aktuell aktiv)', type: String, nullable: true })
  gueltigBis!: string | null;

  @ApiProperty({ description: 'User-ID des Auslösers' })
  aktiviertVonUserId!: string;

  @ApiProperty({ description: 'Begründung (max. 500 Zeichen)' })
  begruendung!: string;

  @ApiProperty({ description: 'Logische Propagation-Gruppen-ID' })
  propagationGroupId!: string;

  @ApiProperty({ description: 'Aktuelle Aggregate-Version (OCC-Token)' })
  version!: number;

  @ApiProperty({
    description:
      'Mutationsklasse: `AKTIVIERT` (neu/erneut aktiv) oder `DEAKTIVIERT` (geschlossen). Erlaubt Frontend-Konsumenten, auch bei reiner Refetch-Antwort den durch diese Operation ausgelösten Wechsel je Zuweisung zu erkennen (AC4).',
    enum: ['AKTIVIERT', 'DEAKTIVIERT'],
  })
  aktion!: 'AKTIVIERT' | 'DEAKTIVIERT';
}

/**
 * Request-DTO für `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/psa-profile/bulk-aendern`
 * (Story 3.2 AC10 — Multi-Select / Bulk-PSA-Änderung).
 *
 * Eine atomare Bulk-Operation für 1–50 Einheiten — der Handler iteriert
 * äußerlich über die Einheiten und legt für **jede** Einheit dieselben
 * `profilToggles` an. Identische Begründung und gemeinsame
 * `propagationGroupId` für alle resultierenden Domain-Events.
 *
 * Cap-Begründung: Architektur §R2 (8+ Abschnitte als Backpressure-Trigger);
 * 50 als Defense-Cap gegen pathologische Inputs.
 */
export class BulkChangePsaProfilDto {
  @ApiProperty({
    description: 'CUIDs der zu ändernden Einheiten — 1–50 Einträge, keine Duplikate.',
    type: String,
    isArray: true,
    minItems: 1,
    maxItems: 50,
    example: ['ck1abcdefghijklmnopqr0001', 'ck1abcdefghijklmnopqr0002', 'ck1abcdefghijklmnopqr0003'],
  })
  @IsArray({ message: 'einheitIds muss ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens eine Einheit erforderlich' })
  @ArrayMaxSize(50, { message: 'Maximal 50 Einheiten pro Bulk-Operation' })
  @ArrayUnique({ message: 'einheitIds.<n> darf nicht doppelt vorkommen' })
  @IsString({ each: true, message: 'einheitIds.<n> muss ein Text sein' })
  @IsCuid2({ each: true, message: 'einheitIds.<n> muss eine gültige CUID2 sein' })
  einheitIds!: string[];

  @ApiProperty({
    description: `Toggle-Liste — wird auf alle Einheiten gleichermaßen angewendet (max. ${PSA_PROFIL_TOGGLE_LIMIT}).`,
    type: () => PsaProfilToggleDto,
    isArray: true,
    minItems: 1,
    maxItems: PSA_PROFIL_TOGGLE_LIMIT,
  })
  @IsArray({ message: 'profilToggles muss ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens ein Profil-Toggle erforderlich' })
  @ArrayMaxSize(PSA_PROFIL_TOGGLE_LIMIT, { message: `Maximal ${PSA_PROFIL_TOGGLE_LIMIT} Profil-Toggles` })
  @ValidateNested({ each: true })
  @Type(() => PsaProfilToggleDto)
  profilToggles!: PsaProfilToggleDto[];

  @ApiProperty({ description: 'Pflicht-Begründung der Bulk-Änderung (1–500 Zeichen, getrimmt)', minLength: 1, maxLength: 500 })
  @IsString({ message: 'begruendung muss ein Text sein' })
  @IsNotEmpty({ message: 'begruendung ist erforderlich' })
  @MinLength(1, { message: 'begruendung darf nicht leer sein' })
  @MaxLength(500, { message: 'begruendung darf maximal 500 Zeichen lang sein' })
  begruendung!: string;
}

/**
 * Response-Wrapper für `POST /einheiten/:einheitId/change` und Bulk-Endpoint.
 *
 * Liefert die `propagationGroupId` und die Liste aller Zuweisungs-Rows,
 * die im Rahmen des Toggles angefasst wurden. Im Bulk-Modus enthält
 * `affected[]` Zeilen aus allen mutierten Einheiten konkateniert.
 */
export class ChangePsaProfilResponseDto {
  @ApiProperty({ description: 'Logische Propagation-Gruppen-ID dieser Toggle-Operation' })
  propagationGroupId!: string;

  @ApiProperty({
    description: 'Pro Profil je nach Pfad: ein Eintrag (Pure-Aktivierung/Deaktivierung) oder zwei (Reaktivierung mit Wechsel: close+create)',
    type: () => PsaProfilZuweisungDto,
    isArray: true,
  })
  affected!: PsaProfilZuweisungDto[];
}
