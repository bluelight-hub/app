import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-Item für `GET /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts`
 * (Story 3.10 AC5). Felder spiegeln das Read-Model des Repositorys, ohne
 * `einsatzId` (Endpoint ist bereits einsatz-scoped) und ohne `resolvedAt`/
 * `resolvedByUserId`/`resolution` (Liste filtert serverseitig auf
 * `resolvedAt IS NULL`).
 */
export class SyncConflictListItemDto {
  @ApiProperty({ description: 'cuid2 der `sync_conflicts`-Row.' })
  id!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'cuid2 der betroffenen Einheit (für PSA-Konflikte immer gesetzt; für Phase-2-GB-Konflikte ggf. null).',
  })
  einheitId!: string | null;

  @ApiProperty({ enum: ['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM'] })
  entityType!: 'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM';

  @ApiProperty({ description: 'cuid2 der konfliktierenden Aggregat-Row.' })
  entityId!: string;

  @ApiProperty({ description: 'Pfad innerhalb der Entity (PSA-Profil: "profil"; Phase 2: feld-spezifisch).' })
  fieldPath!: string;

  @ApiProperty({
    type: Object,
    description: 'Verlierer-State (UI-Repräsentation des lokalen Toggle-Sets, Begründung).',
  })
  localPayload!: Record<string, unknown>;

  @ApiProperty({ description: 'Server-Version zum Zeitpunkt der Konflikt-Erkennung.' })
  serverVersion!: number;

  @ApiProperty({ description: 'Lokal erwartete Version (= expectedVersion im Original-Command).' })
  localExpectedVersion!: number;

  @ApiProperty({ type: String, format: 'date-time', description: 'Zeitpunkt der Konflikt-Meldung (ISO-8601).' })
  reportedAt!: string;

  @ApiProperty({ description: 'cuid2 des Users, der den Konflikt gemeldet hat (Verlierer der Race).' })
  reportedByUserId!: string;
}
