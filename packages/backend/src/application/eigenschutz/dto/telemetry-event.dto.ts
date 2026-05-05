import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

/**
 * Erlaubte Event-Namen für Eigenschutz-Telemetrie (Story 3.11, FR21).
 *
 * Erbt 1:1 die Frontend-Union aus `lib/telemetry-queue.ts`. Reihenfolge muss
 * mit `eigenschutzTelemetryEventNameSchema` (shared) übereinstimmen.
 */
export const TELEMETRY_EVENT_NAMES = [
  'assess_started',
  'assess_completed',
  'assess_aborted',
  'cbrn_announced',
  'cbrn_acknowledged',
  'all_banners_delivered',
  'psa_quittung_abgegeben',
  'quittung_abgegeben',
  'blind_ack',
  'luecke_gemeldet',
  'quittung_ueberfaellig',
] as const;

/**
 * Einzelnes Telemetrie-Event aus dem Frontend-Flush
 * (`POST /einsaetze/:einsatzId/sicherheit/eigenschutz/telemetry`).
 *
 * Class-Validator-Regeln dienen als erste Verteidigungslinie an der HTTP-
 * Grenze; die feinkörnige Schema-Validation (`metadata`-Cell-Constraints,
 * Cap-Drift-Schutz) läuft anschließend per Zod im `TelemetryIngestService`.
 *
 * **PII-Vertrag:** `userId` ist Selbstauskunft des Clients — Service
 * überschreibt mit JWT-Caller (Story 3.11 AC3, Security).
 */
export class TelemetryEventDto {
  @ApiProperty({
    description: 'Event-Name aus der erlaubten 11-Werte-Union (Story 3.11, FR21).',
    enum: TELEMETRY_EVENT_NAMES,
    example: 'cbrn_announced',
  })
  @IsIn(TELEMETRY_EVENT_NAMES as unknown as readonly string[], {
    message: `eventName muss einer von ${TELEMETRY_EVENT_NAMES.join(', ')} sein`,
  })
  eventName!: (typeof TELEMETRY_EVENT_NAMES)[number];

  @ApiProperty({
    description: 'Vom Sender-Drawer erzeugte `candidate-…`-ID (vor Submit) oder echte Server-`propagationGroupId` (CUID, nach Submit). Längen-Cap ≤ 80.',
    minLength: 1,
    maxLength: 80,
    example: 'candidate-7f3a2b1c',
  })
  @IsString()
  @Length(1, 80, { message: 'propagationGroupIdCandidate muss zwischen 1 und 80 Zeichen lang sein' })
  propagationGroupIdCandidate!: string;

  @ApiProperty({
    description: 'Anzahl der vom Event betroffenen Abschnitte (0–1024).',
    minimum: 0,
    maximum: 1024,
    example: 4,
  })
  @IsInt({ message: 'abschnittCount muss eine ganze Zahl sein' })
  @Min(0, { message: 'abschnittCount darf nicht negativ sein' })
  @Max(1024, { message: 'abschnittCount darf maximal 1024 sein' })
  abschnittCount!: number;

  @ApiProperty({
    description: 'Selbstauskunft des Clients — Server überschreibt serverseitig mit JWT-Caller (Story 3.11 AC3, Security).',
    minLength: 1,
    maxLength: 80,
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  @IsString()
  @Length(1, 80, { message: 'userId muss zwischen 1 und 80 Zeichen lang sein' })
  userId!: string;

  @ApiProperty({
    description: 'Stabile Session-Kennung des Clients (Browser-Tab-Lifetime).',
    minLength: 1,
    maxLength: 80,
    example: 'sess-3b9af2c1',
  })
  @IsString()
  @Length(1, 80, { message: 'sessionId muss zwischen 1 und 80 Zeichen lang sein' })
  sessionId!: string;

  @ApiProperty({
    description: 'Client-seitiger Zeitstempel (ISO-8601 mit Offset).',
    format: 'date-time',
    example: '2026-05-04T14:23:11.482+02:00',
  })
  @IsDateString({ strict: true }, { message: 'clientTime muss ein ISO-8601-Datum mit Offset sein' })
  clientTime!: string;

  @ApiPropertyOptional({
    description:
      'Optionale scalar-only-Map (kein Nesting, keine Arrays). Wird vor Persistenz auf 4 KiB UTF-8 getrimmt; bei Cap-Überschreitung droppt der Service `metadata` und ergänzt `trimmed: true`.',
    type: 'object',
    additionalProperties: true,
    example: { drawerVariant: 'cbrn', triggeredBy: 'manual' },
  })
  @IsOptional()
  @IsObject({ message: 'metadata muss ein Objekt sein' })
  metadata?: Record<string, unknown>;
}

/**
 * Batch-Wrapper für Telemetrie-Events. Cap-Werte stammen aus Architektur §B9-N1:
 * Frontend-Flush bündelt höchstens 50 Events; > 50 wird mit 422 abgewiesen.
 */
export class TelemetryEventBatchDto {
  @ApiProperty({
    description: 'Telemetrie-Events des aktuellen Flushes (1–50).',
    type: [TelemetryEventDto],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray({ message: 'events muss ein Array sein' })
  @ArrayMinSize(1, { message: 'events muss mindestens ein Event enthalten' })
  @ArrayMaxSize(50, { message: 'events darf maximal 50 Events enthalten' })
  @ValidateNested({ each: true })
  @Type(() => TelemetryEventDto)
  events!: TelemetryEventDto[];
}
