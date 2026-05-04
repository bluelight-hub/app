import { ApiProperty } from '@nestjs/swagger';

/**
 * Response für `PATCH /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts/:syncConflictId/resolve`
 * (Story 3.10 AC5).
 *
 * `alreadyResolved=true` signalisiert dem Client den Idempotenz-Pfad
 * (z. B. Tab-Reload-Schutz oder paralleler Resolve durch zweiten Sicherheits-
 * beauftragten). Der Client behandelt das wie einen erfolgreichen Resolve.
 */
export class SyncConflictResolveResultDto {
  @ApiProperty({ description: 'cuid2 der aufgelösten `sync_conflicts`-Row.' })
  syncConflictId!: string;

  @ApiProperty({
    description: '`true` wenn der Konflikt bereits zuvor resolved war (Idempotenz / Race-Loser).',
  })
  alreadyResolved!: boolean;

  @ApiProperty({ type: String, format: 'date-time', description: 'Zeitpunkt der Auflösung (ISO-8601).' })
  resolvedAt!: string;
}
