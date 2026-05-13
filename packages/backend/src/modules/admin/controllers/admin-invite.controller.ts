import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

import { CreateInviteHandler } from '@/application/admin/commands/create-invite.handler';
import { CreateInviteCommand } from '@/application/admin/commands/create-invite.command';
import { RevokeInviteHandler } from '@/application/admin/commands/revoke-invite.handler';
import { RevokeInviteCommand } from '@/application/admin/commands/revoke-invite.command';
import { ListInvitesHandler } from '@/application/admin/queries/list-invites.handler';
import { ListInvitesQuery } from '@/application/admin/queries/list-invites.query';
import type { InviteCodeSortDirection, InviteCodeSortField } from '@/application/admin/queries/list-invites.query';
import { CreateInviteDto } from '@/application/admin/dto/create-invite.dto';
import { CreateInviteResponseDto } from '@/application/admin/dto/create-invite-response.dto';
import { InviteCodeListItemDto } from '@/application/admin/dto/invite-code-list-item.dto';
import { RevokeInviteResponseDto } from '@/application/admin/dto/revoke-invite-response.dto';
import { INVITE_ERROR_CODES } from '@/application/admin/errors/invite-error.codes';
import { InviteCodeStatus } from '@domain/value-objects/invite-code-status';

/**
 * Controller fuer Admin Invite-Code Operationen.
 *
 * Erfordert Admin-Rolle (ADMIN oder SUPER_ADMIN) via AdminJwtAuthGuard.
 * Stellt Endpoints zur Verwaltung von Einladungs-Codes bereit.
 *
 * **Rate Limiting:**
 * - POST /admin/invites: Max 10 Anfragen pro Minute
 * - Verhindert Missbrauch und Spam-Erstellung von Codes
 *
 * **Security:**
 * - Nur authentifizierte Admins koennen Codes erstellen
 * - Codes werden im Audit-Log mit maskiertem Wert geloggt
 * - Der Klartext-Code ist NUR in der Create-Response sichtbar
 *
 * @example
 * ```bash
 * curl -X POST http://localhost:3091/api/admin/invites \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: adminToken=..." \
 *   -d '{"expiresAt": "2026-02-01T12:00:00Z", "maxUses": 5, "label": "Team Nord"}'
 * ```
 */
@Controller({ path: 'admin/invites', version: 'alpha' })
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - Admin-Login erforderlich' })
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
export class AdminInviteController {
  constructor(
    private readonly createInviteHandler: CreateInviteHandler,
    private readonly listInvitesHandler: ListInvitesHandler,
    private readonly revokeInviteHandler: RevokeInviteHandler,
  ) {}

  /**
   * Erstellt einen neuen Invite-Code.
   *
   * Der erstellte Code kann an Nutzer weitergegeben werden, um ihnen
   * die Registrierung zu ermoeglichen. Der Klartext-Code wird NUR
   * in dieser Response zurueckgegeben.
   *
   * **Rate Limit:** 10 Anfragen pro Minute
   *
   * @param dto - CreateInviteDto mit expiresAt, maxUses und optional label
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns CreateInviteResponseDto mit Code, Links und Metadaten
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Invite-Code erstellen',
    description: 'Erstellt einen neuen Einladungs-Code fuer neue Nutzer. Der Code wird NUR in dieser Response im Klartext angezeigt. Rate-Limit: 10/Minute.',
  })
  @ApiWrappedCreatedResponse(CreateInviteResponseDto, {
    description: 'Invite-Code erfolgreich erstellt. WICHTIG: Code nur hier sichtbar!',
  })
  @ApiBadRequestResponse({ description: 'Validierung fehlgeschlagen (expiresAt, maxUses, label)' })
  @ApiTooManyRequestsResponse({ description: 'Rate-Limit ueberschritten (10/Minute)' })
  async createInvite(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateInviteDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<CreateInviteResponseDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Default expiresAt berechnen (7 Tage) wenn nicht angegeben
    // ════════════════════════════════════════════════════════════════════════
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + CreateInviteDto.DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // ════════════════════════════════════════════════════════════════════════
    // 2. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = CreateInviteCommand.create({
      expiresAt,
      maxUses: dto.maxUses,
      label: dto.label,
      createdById: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: this.mapErrorCodeToMessage(commandResult.error ?? 'UNKNOWN_ERROR'),
        code: commandResult.error,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.createInviteHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: this.mapErrorCodeToMessage(result.error ?? 'UNKNOWN_ERROR'),
        code: result.error,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Listet alle Invite-Codes mit optionaler Filterung, Sortierung und Pagination.
   *
   * Die Codes werden in der Liste IMMER maskiert (z.B. "ABC1****") zurueckgegeben.
   * Der vollstaendige Code ist nur bei der Erstellung sichtbar.
   *
   * **Filteroptionen:**
   * - status: Filtert nach berechnetem Status (active, used, expired, revoked)
   * - createdBy: Filtert nach dem Ersteller des Codes (User-ID)
   *
   * **Sortieroptionen (format: "field:direction"):**
   * - Erlaubte Felder: createdAt, expiresAt, useCount
   * - Erlaubte Richtungen: asc, desc
   * - Default: createdAt:desc
   *
   * @param status - Optional: Filtert nach InviteCodeStatus
   * @param createdById - Optional: Filtert nach Creator User-ID
   * @param sortParam - Optional: Sortierung (format: "field:direction", z.B. "expiresAt:asc")
   * @param page - Optional: Seitennummer (1-basiert, default: 1)
   * @param pageSize - Optional: Eintraege pro Seite (1-100, default: 20)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns Paginierte Liste der Invite-Codes mit maskierten Codes
   * @throws BadRequestException bei Validierungsfehlern (ungueltige Filter/Sort/Pagination)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liste aller Invite-Codes abrufen',
    description: 'Gibt eine paginierte Liste aller Invite-Codes zurueck. Codes werden maskiert angezeigt (z.B. "ABC1****"). Unterstuetzt Filterung nach Status/Ersteller, Sortierung und Pagination.',
  })
  @ApiWrappedResponse(InviteCodeListItemDto, {
    isArray: true,
    description: 'Paginierte Liste der Invite-Codes',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: InviteCodeStatus,
    description: 'Filtert nach berechnetem Status',
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: String,
    description: 'Filtert nach Creator User-ID',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    example: 'expiresAt:asc',
    description: 'Sortierung (format: "field:direction"). Felder: createdAt, expiresAt, useCount. Richtungen: asc, desc',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Seitennummer (1-basiert)',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Eintraege pro Seite (1-100)',
    example: 20,
  })
  @ApiBadRequestResponse({ description: 'Ungueltige Filter-, Sort- oder Pagination-Parameter' })
  async listInvites(
    @Query('status') status?: string,
    @Query('createdBy') createdById?: string,
    @Query('sort') sortParam?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
    @CurrentUser() user?: ValidatedUser,
  ): Promise<InviteCodeListItemDto[]> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Parse Sort Parameter (format: "field:direction")
    // ════════════════════════════════════════════════════════════════════════
    let sort: { field: InviteCodeSortField; direction: InviteCodeSortDirection } | undefined;

    if (sortParam) {
      const [field, direction] = sortParam.split(':') as [InviteCodeSortField, InviteCodeSortDirection];
      if (field && direction) {
        sort = { field, direction };
      } else {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Ungueltiges Sort-Format. Erwartet: "field:direction" (z.B. "expiresAt:asc")',
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Query erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const queryResult = ListInvitesQuery.create({
      filters: status || createdById ? { status: status as InviteCodeStatus | undefined, createdById } : undefined,
      sort,
      pagination: { page: page ?? 1, pageSize: pageSize ?? 20 },
      requestedById: user?.userId ?? 'unknown',
    });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: this.mapQueryErrorToMessage(queryResult.error ?? 'UNKNOWN_ERROR'),
        code: queryResult.error,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.listInvitesHandler.execute(queryResult.value);

    if (result.isFailure || !result.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: this.mapQueryErrorToMessage(result.error ?? 'UNKNOWN_ERROR'),
        code: result.error,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Success Response - Items zurueckgeben (meta wird durch Interceptor gehandelt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value.data;
  }

  /**
   * Widerruft einen Invite-Code permanent.
   *
   * Nach dem Widerruf kann der Code nicht mehr fuer Registrierungen
   * verwendet werden. Der Status wird auf "revoked" gesetzt.
   *
   * **Idempotentes Verhalten:**
   * - Bereits widerrufene Codes: Success ohne erneutes Event
   * - Bereits aufgebrauchte Codes (USED): Status bleibt USED, Success
   *
   * **Security:**
   * - Code wird in der Response maskiert (z.B. "ABC1****")
   * - Audit-Trail mit maskiertem Code und Admin-ID
   *
   * @param id - ID des zu widerrufenden Invite-Codes
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns Widerrufener Invite-Code mit neuem Status
   * @throws BadRequestException bei Validierungsfehlern
   * @throws NotFoundException wenn Invite-Code nicht existiert
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Invite-Code widerrufen',
    description: 'Widerruft einen Invite-Code permanent. Der Code kann danach nicht mehr verwendet werden. Idempotent: Bereits widerrufene Codes geben Success zurueck.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invite-Code ID',
    example: 'inv_abc123def456ghi789jkl012',
  })
  @ApiWrappedResponse(RevokeInviteResponseDto, {
    description: 'Widerrufener Invite-Code mit neuem Status',
  })
  @ApiNotFoundResponse({ description: 'Invite-Code nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungueltige Invite-Code-ID' })
  async revokeInvite(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<RevokeInviteResponseDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = RevokeInviteCommand.create({
      inviteCodeId: id,
      revokedById: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: commandResult.error ?? 'Ungueltige Invite-Code-ID',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausfuehren (wirft NotFoundException wenn nicht gefunden)
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.revokeInviteHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error ?? 'Widerruf fehlgeschlagen',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Mappt Error Codes zu benutzerfreundlichen Fehlermeldungen.
   *
   * WARUM: Error Codes sind technisch (z.B. INVITE_EXPIRY_TOO_SOON),
   * aber die Fehlermeldung sollte fuer den Benutzer verstaendlich sein.
   *
   * @param errorCode - Technischer Error Code
   * @returns Benutzerfreundliche Fehlermeldung
   */
  private mapErrorCodeToMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      [INVITE_ERROR_CODES.EXPIRY_PAST]: 'Das Ablaufdatum muss in der Zukunft liegen',
      [INVITE_ERROR_CODES.EXPIRY_TOO_SOON]: 'Das Ablaufdatum muss mindestens 1 Minute in der Zukunft liegen',
      [INVITE_ERROR_CODES.MAX_USES_INVALID]: 'maxUses muss zwischen 1 und 100 liegen',
      [INVITE_ERROR_CODES.LABEL_TOO_LONG]: 'Label darf maximal 100 Zeichen haben',
      [INVITE_ERROR_CODES.CREATION_FAILED]: 'Invite-Code konnte nicht erstellt werden',
      [INVITE_ERROR_CODES.SAVE_FAILED]: 'Invite-Code konnte nicht gespeichert werden',
    };

    return errorMessages[errorCode] ?? `Ein Fehler ist aufgetreten: ${errorCode}`;
  }

  /**
   * Mappt Query Error Codes zu benutzerfreundlichen Fehlermeldungen.
   *
   * WARUM: Query Error Codes (z.B. QUERY_INVALID_STATUS) sollten
   * fuer den Benutzer verstaendlich sein.
   *
   * @param errorCode - Technischer Error Code aus ListInvitesQuery
   * @returns Benutzerfreundliche Fehlermeldung
   */
  private mapQueryErrorToMessage(errorCode: string): string {
    // Error Codes aus ListInvitesQuery
    if (errorCode.startsWith('QUERY_INVALID_STATUS')) {
      return 'Ungueltiger Status-Filter. Erlaubte Werte: active, used, expired, revoked';
    }
    if (errorCode.startsWith('QUERY_INVALID_SORT_FIELD')) {
      return 'Ungueltiges Sortierfeld. Erlaubte Felder: createdAt, expiresAt, useCount';
    }
    if (errorCode.startsWith('QUERY_INVALID_SORT_DIRECTION')) {
      return 'Ungueltige Sortierrichtung. Erlaubte Werte: asc, desc';
    }
    if (errorCode.startsWith('QUERY_INVALID_PAGE:')) {
      return 'Ungueltige Seitennummer. Muss >= 1 sein';
    }
    if (errorCode.startsWith('QUERY_INVALID_PAGE_SIZE')) {
      return 'Ungueltige Seitengroesse. Muss zwischen 1 und 100 liegen';
    }
    if (errorCode === 'QUERY_REQUESTED_BY_REQUIRED') {
      return 'Interner Fehler: Anfragender Admin nicht identifiziert';
    }

    return `Ein Fehler ist aufgetreten: ${errorCode}`;
  }
}
