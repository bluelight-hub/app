import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

/**
 * Request-Body für
 * `POST /psa-profile/propagation-groups/:propagationGroupId/luecke-melden`
 * (Story 3.6 AC5, FR20).
 *
 * Pattern: `AckPsaQuittungDto` (Story 3.4) — identische `einheitId`-Regex
 * (cuid2-Längen-Constraint 20–32) gegen DoS-Strings.
 */
export class MeldeLueckeDto {
  @ApiProperty({
    description: 'cuid2 der Einheit, für die die Ausrüstungs-Lücke gemeldet wird.',
    example: 'clw3h8x9y0000qwertyui00050',
  })
  @IsString()
  @Matches(/^[a-z0-9]{20,32}$/, { message: 'einheitId muss ein gültiger cuid2 sein' })
  einheitId!: string;

  @ApiProperty({
    description: 'Klartext-Beschreibung der Ausrüstungs-Lücke. Wird im Audit-Trail der Quittung gehalten und zeitgestempelt. 1–1000 Zeichen.',
    example: 'Schutzanzug Größe L fehlt Einheit 2 — nachgeordert 14:28',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  // Whitespace-only-Eingaben werden bereits an der DTO-Grenze abgewiesen,
  // damit Auth- und Outbox-Lookup nicht für sinnlose Strings ausgeführt
  // werden. Der Handler trimmt zusätzlich (Defense-in-Depth).
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Length(1, 1000, { message: 'meldung muss zwischen 1 und 1000 Zeichen lang sein (nach Trim)' })
  meldung!: string;
}
