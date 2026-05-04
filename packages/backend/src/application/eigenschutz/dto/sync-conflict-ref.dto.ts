import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-Body für `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts`
 * (Story 3.9 AC5).
 *
 * 202 Accepted — Best-Effort-Audit. Der UI-Banner kommt aus dem WS-Frame
 * (`eigenschutz:konflikt-erkannt`), nicht aus diesem Body. Trotzdem braucht
 * der Caller die `syncConflictId` für Telemetrie + ggf. spätere PATCH-Calls
 * (Story 3.10) und `alreadyExisted` für Tab-Reload-Erkennung (kein Banner-
 * Spam).
 */
export class SyncConflictRefDto {
  @ApiProperty({ description: 'cuid2 der angelegten oder existierenden sync_conflicts-Row.' })
  syncConflictId!: string;

  @ApiProperty({ description: 'true bei Idempotenz-Treffer (Tab-Reload-Schutz). Frontend unterdrückt dann Telemetrie/Effekte.' })
  alreadyExisted!: boolean;
}
