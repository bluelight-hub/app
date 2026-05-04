import { Body, ConflictException, Controller, HttpCode, Inject, InternalServerErrorException, NotFoundException, Param, Post, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequiresPermission } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { ReportSyncConflictCommand, type ReportSyncConflictResult } from '@/application/eigenschutz/commands/report-sync-conflict/report-sync-conflict.command';
import { ReportSyncConflictDto } from '@/application/eigenschutz/dto/report-sync-conflict.dto';
import { SyncConflictRefDto } from '@/application/eigenschutz/dto/sync-conflict-ref.dto';

/**
 * Controller für Sync-Konflikt-Endpoints (Story 3.9 AC5, FR50,
 * Architektur §B6).
 *
 * **Eigener Controller statt Co-Location in `PsaProfilController`:** Die
 * URL-Konvention nestet einsatz-scoped Resources unter
 * `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/<resource>`. Da
 * `PsaProfilController` einen festen Prefix `psa-profile` hat, würde eine
 * Co-Location den Story-Pfad
 * `/sicherheit/eigenschutz/sync-conflicts` brechen. Story 3.10 wird hier
 * `GET /sync-conflicts` + `PATCH /sync-conflicts/:id/resolve` ergänzen.
 *
 * **202 Accepted:** Best-Effort-Audit-Charakter. Der Banner kommt aus dem
 * WS-Frame `eigenschutz:konflikt-erkannt` (parallel zum HTTP-Echo).
 *
 * **Permission `eigenschutz:psa:write`-Reuse (PO-Default Q4):** Wer das
 * 409-Mutation-Ergebnis verursacht hat, hatte ein PSA-Toggle-Recht — der
 * Folgecall ist seine eigene Audit-Spur. Kein neuer Permission-Eintrag.
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine ausreichende Permission `eigenschutz:psa:write`' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
export class SyncConflictController {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @Post()
  @HttpCode(202)
  @RequiresPermission('eigenschutz:psa:write')
  @ApiOperation({ summary: 'Sync-Konflikt aus 409-Mutation melden — Story 3.9 (FR50)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiBody({ type: ReportSyncConflictDto })
  @ApiWrappedResponse(SyncConflictRefDto, {
    description: 'Konflikt registriert (frischer Insert) oder als Duplikat erkannt (Idempotenz-Pfad).',
  })
  @ApiBadRequestResponse({ description: 'DTO-Validation (cuid2-Regex / Length-Constraints / Versions)' })
  @ApiUnprocessableEntityResponse({ description: 'Caller-Authorization, Versions-Plausibilität, Payload-Cap, EntityType-Scope' })
  async reportSyncConflict(@Param('einsatzId') einsatzId: string, @Body() dto: ReportSyncConflictDto, @CurrentUser() user: ValidatedUser): Promise<SyncConflictRefDto> {
    const result = (await this.commandBus.execute(
      new ReportSyncConflictCommand(einsatzId, dto.einheitId ?? null, 'PSA_PROFIL_ZUWEISUNG', dto.entityId, dto.fieldPath, dto.localPayload, dto.serverVersion, dto.localExpectedVersion, user.userId),
    )) as Result<ReportSyncConflictResult>;

    if (result.isFailure || !result.value) {
      throw this.mapMutationError(result.error ?? 'Sync-Konflikt-Meldung fehlgeschlagen');
    }
    return { syncConflictId: result.value.syncConflictId, alreadyExisted: result.value.alreadyExisted };
  }

  private mapMutationError(error: string): NotFoundException | UnprocessableEntityException | ConflictException | InternalServerErrorException {
    if (error.startsWith('NotFound:')) {
      const resource = error.slice('NotFound:'.length).toLowerCase();
      return new NotFoundException({ statusCode: 404, error: 'Not Found', message: error, context: { resource } });
    }
    if (error.startsWith('BusinessRule:')) {
      const rule = error.slice('BusinessRule:'.length);
      return new UnprocessableEntityException({ statusCode: 422, error: 'Unprocessable Entity', message: error, context: { rule } });
    }
    if (error.startsWith('ValidationFailed:')) {
      return new UnprocessableEntityException({ statusCode: 422, error: 'Unprocessable Entity', message: error, context: { rule: 'ItemValidation' } });
    }
    if (error.startsWith('ConflictDetected:')) {
      // Defense-in-Depth — Story 3.9 löst eigentlich keinen ConflictDetected aus,
      // aber der Forward-Compat-Fallback bleibt analog zu psa-profil.controller.ts.
      return new ConflictException({ statusCode: 409, error: 'Conflict', message: error, context: { rule: error.slice('ConflictDetected:'.length) } });
    }
    if (error.startsWith('InfrastructureError:') || error.startsWith('Invariant:')) {
      return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' } });
    }
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected ReportSyncConflict mutation error', { errorCategory });
    return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { rule: 'Unexpected' } });
  }
}
