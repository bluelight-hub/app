import { BadRequestException, Body, Controller, HttpCode, Inject, Param, Post, UnauthorizedException, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { TelemetryIngestService } from '@/infrastructure/eigenschutz/telemetry/telemetry-ingest.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequiresPermission } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { TelemetryEventBatchDto } from '@/application/eigenschutz/dto/telemetry-event.dto';
import { TelemetryIngestResultDto } from '@/application/eigenschutz/dto/telemetry-ingest-result.dto';
import { redactId } from '@/shared/utils/pii-redact.util';

/**
 * CUID2-Format aus `@paralleldrive/cuid2`: 24–32 Kleinbuchstaben/Ziffern,
 * beginnt mit einem Buchstaben. Passt 1:1 zu den von der Plattform erzeugten
 * Einsatz-IDs. Defense-in-Depth — der `EinsatzScopeGuard` prüft bereits, ob
 * der User Zugriff auf `einsatzId` hat, aber er normalisiert die ID nicht.
 */
const CUID2_REGEX = /^[a-z][a-z0-9]{23,31}$/;

/**
 * HTTP-Eintrittspunkt für client-seitige Telemetrie-Batches (Story 3.11, FR21,
 * Architektur §B9).
 *
 * **Pfad:** `POST /einsaetze/:einsatzId/sicherheit/eigenschutz/telemetry` —
 * gespiegelt aus dem `SyncConflictController`-Pattern (Story 3.9/3.10).
 *
 * **Status `202 Accepted` statt `201 Created`:** Telemetrie ist Best-
 * Effort-Audit, kein Mutation-Pfad eines Domain-Aggregates.
 *
 * **Permission `eigenschutz:telemetry:write`:** Permission existiert seit
 * Story 1.5; semantisch „jeder Einsatz-Teilnehmer im Eigenschutz-Bundle".
 *
 * **NICHT idempotent:** Doppelte Sends desselben Batches landen als
 * Duplikate. Aggregat-Korrektur via post-pilot SQL-`GROUP BY`.
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Permission `eigenschutz:telemetry:write` fehlt im Einsatz-Kontext' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/telemetry', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
export class EigenschutzTelemetryController {
  constructor(
    private readonly ingestService: TelemetryIngestService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @Post()
  @HttpCode(202)
  @RequiresPermission('eigenschutz:telemetry:write')
  @ApiOperation({ summary: 'Telemetrie-Batch (1–50 Events) für CBRN-Moment-Auswertung — Story 3.11 (FR21, AR8)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiBody({ type: TelemetryEventBatchDto, description: 'Batch von 1–50 Telemetrie-Events.' })
  @ApiWrappedResponse(TelemetryIngestResultDto, {
    description: 'Telemetrie-Batch akzeptiert + persistiert (Best-Effort).',
  })
  @ApiBadRequestResponse({ description: 'DTO-Validation (Event-Name, Längen-Caps, Datums-Format)' })
  @ApiUnprocessableEntityResponse({ description: 'Zod-Drift, Persistenz-Fehler, oder Cap-Verletzung' })
  async ingest(@Param('einsatzId') einsatzId: string, @Body() batch: TelemetryEventBatchDto, @CurrentUser() user: ValidatedUser): Promise<TelemetryIngestResultDto> {
    if (!CUID2_REGEX.test(einsatzId)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'einsatzId muss ein gültiger CUID2 sein',
        context: { rule: 'EinsatzIdInvalid' },
      });
    }
    if (!user?.userId || user.userId.length > 80) {
      // Defense-in-Depth: JwtAuthGuard sollte das vorab abfangen, aber der DB-
      // userId-Cap ist VarChar(80); ein > 80 Zeichen langes JWT-`sub` würde an
      // der DB durchschlagen und einen 500-Fehler erzeugen.
      throw new UnauthorizedException();
    }

    const result = (await this.ingestService.ingestBatch(einsatzId, user.userId, batch)) as Result<{ insertedCount: number }>;
    if (result.isFailure || !result.value) {
      // Defense-in-Depth: Result.error kann interne DB-Fehler-Strings tragen
      // (z. B. `PersistTelemetryFailed:Foreign key constraint failed …`); die
      // bleiben im internen Log, aber NICHT im HTTP-Body. Wir mappen auf
      // stabile, nicht-leakende Marker.
      this.logger.warn?.(
        JSON.stringify({
          context: 'EigenschutzTelemetryController',
          einsatzId: redactId(einsatzId),
          userId: redactId(user.userId),
          error: result.error ?? 'unknown',
        }),
        'EigenschutzTelemetryController',
      );
      const isValidation = result.error?.startsWith('ValidationFailed:') === true;
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: isValidation ? 'TelemetryValidationFailed' : 'TelemetryIngestFailed',
        context: { rule: isValidation ? 'TelemetryValidationFailed' : 'TelemetryIngestFailed' },
      });
    }
    return { insertedCount: result.value.insertedCount };
  }
}
