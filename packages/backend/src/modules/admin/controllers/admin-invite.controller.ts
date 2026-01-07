import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

import { CreateInviteHandler } from '@/application/admin/commands/create-invite.handler';
import { CreateInviteCommand } from '@/application/admin/commands/create-invite.command';
import { CreateInviteDto } from '@/application/admin/dto/create-invite.dto';
import { CreateInviteResponseDto } from '@/application/admin/dto/create-invite-response.dto';
import { INVITE_ERROR_CODES } from '@/application/admin/errors/invite-error.codes';

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
@Controller('admin/invites')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - Admin-Login erforderlich' })
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
export class AdminInviteController {
  constructor(private readonly createInviteHandler: CreateInviteHandler) {}

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
    // 1. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = CreateInviteCommand.create({
      expiresAt: new Date(dto.expiresAt),
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
}
