import { ApiProperty } from '@nestjs/swagger';

/**
 * Response-DTO für `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/telemetry`
 * (Story 3.11, FR21, AC3).
 *
 * Trägt die Anzahl tatsächlich persistierter Events. Bei `Result.ok`-Pfad
 * gilt `insertedCount === request.events.length` — Telemetrie-Persistenz ist
 * atomar (`createMany` in einem Statement).
 */
export class TelemetryIngestResultDto {
  @ApiProperty({
    description: 'Anzahl der erfolgreich persistierten Telemetrie-Events. Cap analog zum Request-Limit (50).',
    minimum: 0,
    maximum: 50,
    example: 12,
  })
  insertedCount!: number;
}
