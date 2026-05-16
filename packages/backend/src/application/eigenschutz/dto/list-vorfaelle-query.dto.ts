import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsISO8601, IsOptional, IsString, Matches } from 'class-validator';

/**
 * cuid2-Pattern: 24–32 lowercase alphanumerische Zeichen (Pattern wie in
 * `application/erinnerung/queries/*` etabliert; Prisma `@default(cuid())`
 * liefert 25 Zeichen, ältere Cuid-IDs können 26 Zeichen haben). Wird hier
 * serverseitig pro Listen-Element angewendet, damit `IN`-Bombs / SQL-
 * Injection-Versuche früh mit 400 abgelehnt werden.
 */
const CUID2_PATTERN = /^[a-z0-9]{24,32}$/;

/**
 * Query-DTO für `GET .../vorfaelle?einheitIds=cuid1,cuid2&...` (Story 5.3, AC3).
 *
 * `einheitIds` wird als CSV-String erwartet (URL-Param-freundlich) und im
 * Transformer zu einem getrimmten String-Array geparst. Leerer/fehlender
 * Param → `undefined` (kein Filter).
 */
export class ListVorfaelleQueryDto {
  @ApiPropertyOptional({
    description: 'Komma-separierte CUID2-Liste (max 50 Einträge), z. B. "id1,id2".',
    example: 'clw3h8x9y0000qwertyui05002,clw3h8x9y0000qwertyui05004',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) {
      const arr = value.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
      return arr.length === 0 ? undefined : arr;
    }
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (trimmed.length === 0) return undefined;
    const parsed = trimmed
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return parsed.length === 0 ? undefined : parsed;
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(CUID2_PATTERN, { each: true, message: 'einheitIds enthält ungültige CUID2-Einträge' })
  einheitIds?: string[];

  @ApiPropertyOptional({ description: 'Untergrenze des Zeitraums (ISO 8601 mit Offset).', example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601({ strict: true })
  vorfallZeitVon?: string;

  @ApiPropertyOptional({ description: 'Obergrenze (exklusiv) des Zeitraums (ISO 8601 mit Offset).', example: '2026-05-08T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601({ strict: true })
  vorfallZeitBis?: string;

  @ApiPropertyOptional({ description: 'Filter „nur Unfallkasse-relevant" — `true`/`false`/weglassen für „beide".', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  unfallkasseRelevant?: boolean;

  @ApiPropertyOptional({
    description: 'Status-Filter (Issue #415). `OFFEN` listet noch nicht geschlossene Vorfälle, `GESCHLOSSEN` nur geschlossene. Weglassen → beide.',
    enum: ['OFFEN', 'GESCHLOSSEN'],
    example: 'OFFEN',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    return value.trim().toUpperCase();
  })
  @IsIn(['OFFEN', 'GESCHLOSSEN'])
  status?: 'OFFEN' | 'GESCHLOSSEN';
}
