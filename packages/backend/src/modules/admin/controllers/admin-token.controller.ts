import { BadRequestException, Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus, InternalServerErrorException, ParseIntPipe, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

import { CreateAccessTokenHandler } from '@/application/admin/commands/create-access-token.handler';
import { CreateAccessTokenCommand } from '@/application/admin/commands/create-access-token.command';
import { CreateAccessTokenDto } from '@/application/admin/dto/create-access-token.dto';
import { CreateAccessTokenResponseDto } from '@/application/admin/dto/create-access-token-response.dto';
import { ACCESS_TOKEN_ERROR_CODES } from '@/application/admin/errors/access-token-error.codes';
import { GetTokenListHandler } from '@/application/admin/queries/get-token-list.handler';
import { GetTokenListQuery } from '@/application/admin/queries/get-token-list.query';
import { TokenListItemDto } from '@/application/admin/dto/token-list-item.dto';

/**
 * Controller fuer Admin Access-Token Operationen.
 *
 * Erfordert Admin-Rolle (ADMIN oder SUPER_ADMIN) via AdminJwtAuthGuard.
 * Stellt Endpoints zur Verwaltung von Server-Access-Tokens bereit.
 *
 * **Rate Limiting:**
 * - POST /admin/tokens: Max 10 Anfragen pro Minute
 * - Verhindert Missbrauch und Spam-Erstellung von Tokens
 *
 * **Security:**
 * - Nur authentifizierte Admins koennen Tokens erstellen
 * - Tokens werden mit bcrypt gehasht gespeichert
 * - Das Klartext-Token ist NUR in der Create-Response sichtbar
 *
 * @example
 * ```bash
 * curl -X POST http://localhost:3091/api/admin/tokens \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: adminToken=..." \
 *   -d '{"name": "CI/CD Pipeline Token"}'
 * ```
 */
@Controller('admin/tokens')
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - Admin-Login erforderlich' })
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
export class AdminTokenController {
  constructor(
    private readonly createAccessTokenHandler: CreateAccessTokenHandler,
    private readonly getTokenListHandler: GetTokenListHandler,
  ) {}

  /**
   * Listet alle Server-Access-Tokens mit Pagination auf.
   *
   * Gibt eine paginierte Liste aller Tokens zurück. Der Token-Hash
   * wird aus Sicherheitsgründen NIEMALS zurückgegeben.
   *
   * @param page - Seitennummer (1-basiert, default: 1)
   * @param limit - Einträge pro Seite (1-100, default: 20)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns TokenListItemDto[] - Liste der Tokens
   */
  @Get()
  @ApiOperation({
    summary: 'Access-Tokens auflisten',
    description: 'Gibt eine paginierte Liste aller Server-Access-Tokens zurück. Token-Hashes werden aus Sicherheitsgründen nicht angezeigt.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Seitennummer (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Einträge pro Seite (default: 20, max: 100)', example: 20 })
  @ApiWrappedResponse(TokenListItemDto, {
    isArray: true,
    description: 'Liste aller Access-Tokens',
  })
  async listTokens(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: ValidatedUser,
  ): Promise<TokenListItemDto[]> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Query erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const queryResult = GetTokenListQuery.create({
      page,
      limit,
      requestedById: user.userId,
    });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: queryResult.error ?? 'Ungültige Query-Parameter',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausführen
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.getTokenListHandler.execute(queryResult.value);

    if (result.isFailure || !result.value) {
      throw new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error ?? 'Fehler beim Laden der Tokens',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value.data;
  }

  /**
   * Erstellt einen neuen Server-Access-Token.
   *
   * Das erstellte Token kann fuer die Server-Authentifizierung verwendet
   * werden. Das Klartext-Token wird NUR in dieser Response zurueckgegeben
   * und kann spaeter NICHT erneut abgerufen werden!
   *
   * **Rate Limit:** 10 Anfragen pro Minute
   *
   * @param dto - CreateAccessTokenDto mit name (3-50 Zeichen)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns CreateAccessTokenResponseDto mit Token und Metadaten
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Access-Token erstellen',
    description: 'Erstellt einen neuen Server-Access-Token. Das Token wird NUR in dieser Response im Klartext angezeigt. Rate-Limit: 10/Minute.',
  })
  @ApiWrappedCreatedResponse(CreateAccessTokenResponseDto, {
    description: 'Token erfolgreich erstellt. WICHTIG: Token nur hier sichtbar!',
  })
  @ApiBadRequestResponse({ description: 'Validierung fehlgeschlagen (name Laenge)' })
  @ApiTooManyRequestsResponse({ description: 'Rate-Limit ueberschritten (10/Minute)' })
  async createToken(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CreateAccessTokenDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<CreateAccessTokenResponseDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = CreateAccessTokenCommand.create({
      name: dto.name,
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
    const result = await this.createAccessTokenHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw this.mapErrorToException(result.error ?? 'UNKNOWN_ERROR');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Mappt Error Codes zu HTTP Exceptions.
   *
   * WARUM: Validation Error Codes sollten BadRequest (400) sein,
   * technische Fehler sollten InternalServerError (500) sein.
   *
   * @param errorCode - Technischer Error Code
   * @returns Entsprechende HTTP Exception
   */
  private mapErrorToException(errorCode: string): BadRequestException | InternalServerErrorException {
    switch (errorCode) {
      case ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY:
      case ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT:
      case ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG:
        return new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: this.mapErrorCodeToMessage(errorCode),
          code: errorCode,
        });
      default:
        return new InternalServerErrorException({
          statusCode: 500,
          error: 'Internal Server Error',
          message: this.mapErrorCodeToMessage(errorCode),
          code: errorCode,
        });
    }
  }

  /**
   * Mappt Error Codes zu benutzerfreundlichen Fehlermeldungen.
   *
   * WARUM: Error Codes sind technisch (z.B. ACCESS_TOKEN_NAME_TOO_SHORT),
   * aber die Fehlermeldung sollte fuer den Benutzer verstaendlich sein.
   *
   * @param errorCode - Technischer Error Code
   * @returns Benutzerfreundliche Fehlermeldung
   */
  private mapErrorCodeToMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      [ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY]: 'Der Token-Name darf nicht leer sein',
      [ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT]: 'Der Token-Name muss mindestens 3 Zeichen lang sein',
      [ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG]: 'Der Token-Name darf maximal 50 Zeichen lang sein',
      [ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED]: 'Das Token konnte nicht erstellt werden',
      [ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED]: 'Das Token konnte nicht gespeichert werden',
      [ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED]: 'Fehler bei der Token-Verschluesselung',
    };

    return errorMessages[errorCode] ?? `Ein Fehler ist aufgetreten: ${errorCode}`;
  }
}
