import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
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
import { ResolveKonfliktCommand, type ResolveKonfliktResult } from '@/application/eigenschutz/commands/resolve-konflikt/resolve-konflikt.command';
import { ListSyncConflictsQuery, type ListSyncConflictsResult, type SyncConflictListItem } from '@/application/eigenschutz/queries/list-sync-conflicts/list-sync-conflicts.query';
import { ReportSyncConflictDto } from '@/application/eigenschutz/dto/report-sync-conflict.dto';
import { ResolveSyncConflictDto } from '@/application/eigenschutz/dto/resolve-sync-conflict.dto';
import { ListSyncConflictsFilterDto } from '@/application/eigenschutz/dto/list-sync-conflicts-filter.dto';
import { SyncConflictListItemDto } from '@/application/eigenschutz/dto/sync-conflict-list-item.dto';
import { SyncConflictRefDto } from '@/application/eigenschutz/dto/sync-conflict-ref.dto';
import { SyncConflictResolveResultDto } from '@/application/eigenschutz/dto/sync-conflict-resolve-result.dto';

/**
 * Controller für Sync-Konflikt-Endpoints (Story 3.9 AC5 + Story 3.10 AC5,
 * FR50, Architektur §B6).
 *
 * **Eigener Controller statt Co-Location in `PsaProfilController`:** Die
 * URL-Konvention nestet einsatz-scoped Resources unter
 * `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/<resource>`. Da
 * `PsaProfilController` einen festen Prefix `psa-profile` hat, würde eine
 * Co-Location den Story-Pfad `/sicherheit/eigenschutz/sync-conflicts` brechen.
 *
 * **Endpoints:**
 * - `POST /` (Story 3.9, 202 Accepted): Sync-Konflikt aus 409-Mutation melden.
 * - `GET /` (Story 3.10, 200 OK): Liste offener Konflikte für die UI.
 *   Permission `eigenschutz:psa:read` — Nachbereitung darf lesen, nicht resolven.
 * - `PATCH /:syncConflictId/resolve` (Story 3.10, 200 OK): Konflikt auflösen.
 *   Permission `eigenschutz:psa:write` — nur Sicherheitsbeauftragte.
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine ausreichende Permission für die Aktion' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
export class SyncConflictController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
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

  @Get()
  @RequiresPermission('eigenschutz:psa:read')
  @ApiOperation({ summary: 'Liste offener Sync-Konflikte für den Einsatz — Story 3.10 (FR50, UX-DR6)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiQuery({ name: 'entityType', required: false, enum: ['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM'] })
  @ApiQuery({ name: 'einheitId', required: false, type: String })
  @ApiWrappedResponse(SyncConflictListItemDto, {
    description: 'Offene Konflikte, sortiert nach reportedAt DESC.',
    isArray: true,
  })
  @ApiUnprocessableEntityResponse({ description: 'Caller ist kein Einsatz-Teilnehmer' })
  async listSyncConflicts(@Param('einsatzId') einsatzId: string, @Query() filter: ListSyncConflictsFilterDto, @CurrentUser() user: ValidatedUser): Promise<readonly SyncConflictListItemDto[]> {
    const result = (await this.queryBus.execute(
      new ListSyncConflictsQuery(einsatzId, user.userId, {
        entityType: filter.entityType,
        einheitId: filter.einheitId,
      }),
    )) as Result<ListSyncConflictsResult>;

    if (result.isFailure || !result.value) {
      throw this.mapMutationError(result.error ?? 'Sync-Konflikt-Liste konnte nicht geladen werden');
    }
    return result.value.conflicts.map(toSyncConflictListItemDto);
  }

  @Patch(':syncConflictId/resolve')
  @HttpCode(200)
  @RequiresPermission('eigenschutz:psa:write')
  @ApiOperation({ summary: 'Sync-Konflikt auflösen — Story 3.10 (FR50, UX-DR6)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'syncConflictId', type: String, description: 'CUID der `sync_conflicts`-Row' })
  @ApiBody({ type: ResolveSyncConflictDto })
  @ApiWrappedResponse(SyncConflictResolveResultDto, {
    description: 'Konflikt aufgelöst (oder bereits resolved — Idempotenz).',
  })
  @ApiBadRequestResponse({ description: 'DTO-Validation (resolution-Enum)' })
  @ApiUnprocessableEntityResponse({ description: 'Caller-Authorization, EntityType-Scope, Payload-Schema-Drift' })
  async resolveSyncConflict(
    @Param('einsatzId') einsatzId: string,
    @Param('syncConflictId') syncConflictId: string,
    @Body() dto: ResolveSyncConflictDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<SyncConflictResolveResultDto> {
    const result = (await this.commandBus.execute(new ResolveKonfliktCommand(einsatzId, syncConflictId, dto.resolution, user.userId))) as Result<ResolveKonfliktResult>;

    if (result.isFailure || !result.value) {
      throw this.mapMutationError(result.error ?? 'Sync-Konflikt-Resolve fehlgeschlagen');
    }
    return {
      syncConflictId: result.value.syncConflictId,
      alreadyResolved: result.value.alreadyResolved,
      resolvedAt: result.value.resolvedAt.toISOString(),
    };
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
      // Sekundärer Konflikt im LOCAL_WINS-Reapply (Story 3.10 AC4) oder Forward-Compat
      // aus Story 3.9. 409 mit context.rule = unmaskierter Sentinel-Body.
      return new ConflictException({ statusCode: 409, error: 'Conflict', message: error, context: { rule: error.slice('ConflictDetected:'.length) } });
    }
    if (error.startsWith('InfrastructureError:') || error.startsWith('Invariant:')) {
      return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' } });
    }
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected SyncConflict mutation error', { errorCategory });
    return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { rule: 'Unexpected' } });
  }
}

function toSyncConflictListItemDto(item: SyncConflictListItem): SyncConflictListItemDto {
  return {
    id: item.id,
    einheitId: item.einheitId,
    entityType: item.entityType,
    entityId: item.entityId,
    fieldPath: item.fieldPath,
    localPayload: item.localPayload,
    serverVersion: item.serverVersion,
    localExpectedVersion: item.localExpectedVersion,
    reportedAt: item.reportedAt.toISOString(),
    reportedByUserId: item.reportedByUserId,
  };
}
