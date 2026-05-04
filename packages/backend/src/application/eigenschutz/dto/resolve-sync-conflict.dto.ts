import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * Request-Body für `PATCH /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts/:syncConflictId/resolve`
 * (Story 3.10 AC5).
 *
 * Resolution-Werte:
 * - `SERVER_WINS`: Server-State bleibt; reine Audit-Markierung.
 * - `LOCAL_WINS`: Verlierer-Toggle-Set wird auf das Aggregat angewendet.
 * - `MERGED`: Phase-1 (PSA-Profil) ≡ `SERVER_WINS` + Audit-Marker;
 *   Phase-2 (Gefährdungsbeurteilungs-Items) implementiert echten Field-Merge.
 */
export class ResolveSyncConflictDto {
  @ApiProperty({
    enum: ['SERVER_WINS', 'LOCAL_WINS', 'MERGED'],
    description: 'Auflösungsmodus für den Konflikt.',
  })
  @IsEnum(['SERVER_WINS', 'LOCAL_WINS', 'MERGED'])
  resolution!: 'SERVER_WINS' | 'LOCAL_WINS' | 'MERGED';
}
