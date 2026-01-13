import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

import { CreateAccessTokenHandler } from '@/application/admin/commands/create-access-token.handler';
import { CreateAccessTokenCommand } from '@/application/admin/commands/create-access-token.command';
import { RevokeAccessTokenHandler } from '@/application/admin/commands/revoke-access-token.handler';
import { RevokeAccessTokenCommand } from '@/application/admin/commands/revoke-access-token.command';
import { ReactivateAccessTokenHandler } from '@/application/admin/commands/reactivate-access-token.handler';
import { ReactivateAccessTokenCommand } from '@/application/admin/commands/reactivate-access-token.command';
import { RotateAccessTokenHandler } from '@/application/admin/commands/rotate-access-token.handler';
import { RotateAccessTokenCommand } from '@/application/admin/commands/rotate-access-token.command';
import { CreateAccessTokenDto } from '@/application/admin/dto/create-access-token.dto';
import { CreateAccessTokenResponseDto } from '@/application/admin/dto/create-access-token-response.dto';
import { RotateAccessTokenRequestDto, RotateAccessTokenResponseDto } from '@/application/admin/dto/rotate-access-token.dto';
import { ACCESS_TOKEN_ERROR_CODES } from '@/application/admin/errors/access-token-error.codes';
import { GetTokenListHandler } from '@/application/admin/queries/get-token-list.handler';
import { GetTokenListQuery, type TokenSortBy, type TokenSortOrder } from '@/application/admin/queries/get-token-list.query';
import { TokenListItemDto } from '@/application/admin/dto/token-list-item.dto';
import type { PaginatedData } from '@/infrastructure/http/interceptors/transform.interceptor';

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
    private readonly revokeAccessTokenHandler: RevokeAccessTokenHandler,
    private readonly reactivateAccessTokenHandler: ReactivateAccessTokenHandler,
    private readonly rotateAccessTokenHandler: RotateAccessTokenHandler,
  ) {}

  /**
   * Listet alle Server-Access-Tokens mit Pagination, Sortierung und Filter auf.
   *
   * Gibt eine paginierte Liste aller Tokens zurück. Der Token-Hash
   * wird aus Sicherheitsgründen NIEMALS zurückgegeben.
   *
   * **Sortierung (Story 4.3):**
   * - sortBy: 'createdAt' | 'lastUsedAt' | 'name' (default: 'createdAt')
   * - sortOrder: 'asc' | 'desc' (default: 'desc')
   *
   * **Inaktivitäts-Filter (Story 4.3):**
   * - inactiveDays: Tokens die länger als X Tage nicht verwendet wurden
   * - Inkludiert auch Tokens die NIE verwendet wurden (lastUsedAt IS NULL)
   *
   * @param page - Seitennummer (1-basiert, default: 1)
   * @param limit - Einträge pro Seite (1-100, default: 20)
   * @param sortBy - Sortierfeld (default: 'createdAt')
   * @param sortOrder - Sortierrichtung (default: 'desc')
   * @param inactiveDays - Filter: Tokens > X Tage inaktiv (optional)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns TokenListItemDto[] - Liste der Tokens
   */
  @Get()
  @ApiOperation({
    summary: 'Access-Tokens auflisten',
    description:
      'Gibt eine paginierte, sortierbare und filterbare Liste aller Server-Access-Tokens zurück. Token-Hashes werden aus Sicherheitsgründen nicht angezeigt. Mit inactiveDays können inaktive Tokens gefiltert werden.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Seitennummer (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Einträge pro Seite (default: 20, max: 100)', example: 20 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'lastUsedAt', 'name'],
    description: 'Sortierfeld (default: createdAt)',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sortierrichtung (default: desc)',
    example: 'desc',
  })
  @ApiQuery({
    name: 'inactiveDays',
    required: false,
    type: Number,
    description: 'Filter: Tokens die länger als X Tage nicht verwendet wurden (inkl. nie verwendet)',
    example: 30,
  })
  @ApiWrappedResponse(TokenListItemDto, {
    isArray: true,
    description: 'Liste aller Access-Tokens',
  })
  async listTokens(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy?: TokenSortBy,
    @Query('sortOrder') sortOrder?: TokenSortOrder,
    @Query('inactiveDays') inactiveDaysRaw?: string,
    @CurrentUser() user?: ValidatedUser,
  ): Promise<PaginatedData<TokenListItemDto>> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Parse inactiveDays (optional integer)
    // ════════════════════════════════════════════════════════════════════════
    const inactiveDays = inactiveDaysRaw ? Number.parseInt(inactiveDaysRaw, 10) : undefined;
    if (inactiveDaysRaw && Number.isNaN(inactiveDays)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'inactiveDays muss eine ganze Zahl sein',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Query erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const queryResult = GetTokenListQuery.create({
      page,
      limit,
      sortBy,
      sortOrder,
      inactiveDays,
      requestedById: user?.userId ?? 'anonymous',
    });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: queryResult.error ?? 'Ungültige Query-Parameter',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Handler ausführen
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
    // 4. Success Response (wird durch TransformInterceptor gewrappt)
    //    Format: PaginatedData<T> mit items, total, page, limit
    //    Interceptor transformiert zu { data, meta, pagination }
    // ════════════════════════════════════════════════════════════════════════
    return {
      items: result.value.data,
      total: result.value.meta.total,
      page: result.value.meta.page,
      limit: result.value.meta.pageSize,
    };
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
   * Widerruft ein Access-Token.
   *
   * Das Token wird als widerrufen markiert und kann nicht mehr verwendet werden.
   * Die Operation ist idempotent - mehrfaches Widerrufen ist erlaubt.
   *
   * **Rate Limit:** 10 Anfragen pro Minute
   *
   * @param id - Token-ID (AccessTokenId)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns TokenListItemDto mit aktualisiertem Status
   * @throws NotFoundException wenn Token nicht gefunden
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Access-Token widerrufen',
    description: 'Widerruft ein Access-Token. Das Token kann danach nicht mehr verwendet werden. Rate-Limit: 10/Minute.',
  })
  @ApiParam({ name: 'id', description: 'Token-ID', example: 'blh_abc123def456ghi789jkl012' })
  @ApiWrappedResponse(TokenListItemDto, {
    description: 'Token erfolgreich widerrufen',
  })
  @ApiNotFoundResponse({ description: 'Token nicht gefunden' })
  @ApiTooManyRequestsResponse({ description: 'Rate-Limit ueberschritten (10/Minute)' })
  async revokeToken(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<TokenListItemDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = RevokeAccessTokenCommand.create({
      tokenId: id,
      requestedById: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: this.mapErrorCodeToMessage(commandResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND),
        code: commandResult.error,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.revokeAccessTokenHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw this.mapRevokeErrorToException(result.error ?? 'UNKNOWN_ERROR');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Reaktiviert ein widerrufenes Access-Token.
   *
   * Das Token wird wieder als aktiv markiert und kann erneut verwendet werden.
   * Die Operation ist idempotent - mehrfaches Reaktivieren ist erlaubt.
   *
   * **Rate Limit:** 10 Anfragen pro Minute
   *
   * @param id - Token-ID (AccessTokenId)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns TokenListItemDto mit aktualisiertem Status
   * @throws NotFoundException wenn Token nicht gefunden
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Access-Token reaktivieren',
    description: 'Reaktiviert ein widerrufenes Access-Token. Das Token kann danach wieder verwendet werden. Rate-Limit: 10/Minute.',
  })
  @ApiParam({ name: 'id', description: 'Token-ID', example: 'blh_abc123def456ghi789jkl012' })
  @ApiWrappedResponse(TokenListItemDto, {
    description: 'Token erfolgreich reaktiviert',
  })
  @ApiNotFoundResponse({ description: 'Token nicht gefunden' })
  @ApiTooManyRequestsResponse({ description: 'Rate-Limit ueberschritten (10/Minute)' })
  async reactivateToken(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<TokenListItemDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = ReactivateAccessTokenCommand.create({
      tokenId: id,
      requestedById: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'Not Found',
        message: this.mapErrorCodeToMessage(commandResult.error ?? ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND),
        code: commandResult.error,
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.reactivateAccessTokenHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw this.mapReactivateErrorToException(result.error ?? 'UNKNOWN_ERROR');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Rotiert ein Access-Token.
   *
   * Bei einer Token-Rotation wird das alte Token widerrufen und ein neues
   * Token mit denselben Berechtigungen erstellt. Das neue Token verweist
   * auf das alte Token via `rotatedFromId` fuer vollstaendige Audit-Trail-
   * Nachverfolgbarkeit.
   *
   * **WICHTIG:** Das neue Token ist NUR in dieser Response sichtbar!
   *
   * **Rate Limit:** 5 Anfragen pro Minute (strenger als create)
   *
   * @param id - Token-ID (mindestens 24 Zeichen)
   * @param dto - RotateAccessTokenRequestDto mit optionalem newName
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns RotateAccessTokenResponseDto mit neuem Token und Metadaten
   * @throws NotFoundException wenn Token nicht gefunden
   * @throws BadRequestException wenn Token revoked oder expired ist
   */
  @Post(':id/rotate')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Access-Token rotieren',
    description: 'Rotiert ein Access-Token: Das alte Token wird widerrufen, ein neues wird erstellt. Das neue Token ist NUR in dieser Response sichtbar! Rate-Limit: 5/Minute.',
  })
  @ApiParam({ name: 'id', description: 'Token-ID (mindestens 24 Zeichen)', example: 'blh_abc123def456ghi789jkl012' })
  @ApiWrappedCreatedResponse(RotateAccessTokenResponseDto, {
    description: 'Token erfolgreich rotiert. WICHTIG: Neues Token nur hier sichtbar!',
  })
  @ApiNotFoundResponse({ description: 'Token nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Token ist revoked oder expired (nicht rotierbar)' })
  @ApiTooManyRequestsResponse({ description: 'Rate-Limit ueberschritten (5/Minute)' })
  async rotateToken(
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: RotateAccessTokenRequestDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<RotateAccessTokenResponseDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Command erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = RotateAccessTokenCommand.create({
      tokenId: id,
      newName: dto.newName,
      requestedById: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      // Token-ID Validierungsfehler werden als 404 behandelt
      throw this.mapRotateErrorToException(commandResult.error ?? ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID);
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.rotateAccessTokenHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw this.mapRotateErrorToException(result.error ?? 'UNKNOWN_ERROR');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    //    Handler gibt createdAt bereits als ISO-String zurueck - keine Konvertierung noetig
    // ════════════════════════════════════════════════════════════════════════
    return {
      token: result.value.token,
      name: result.value.name,
      prefix: result.value.prefix,
      createdAt: result.value.createdAt,
      rotatedFromId: result.value.rotatedFromId,
    };
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
   * Mappt Revoke-Fehler auf HTTP Exceptions.
   *
   * @param errorCode - Technischer Error Code
   * @returns Entsprechende HTTP Exception
   */
  private mapRevokeErrorToException(errorCode: string): NotFoundException | InternalServerErrorException {
    switch (errorCode) {
      case ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND:
        return new NotFoundException({
          statusCode: 404,
          error: 'Not Found',
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
   * Mappt Reactivate-Fehler auf HTTP Exceptions.
   *
   * @param errorCode - Technischer Error Code
   * @returns Entsprechende HTTP Exception
   */
  private mapReactivateErrorToException(errorCode: string): NotFoundException | BadRequestException | InternalServerErrorException {
    switch (errorCode) {
      case ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND:
        return new NotFoundException({
          statusCode: 404,
          error: 'Not Found',
          message: this.mapErrorCodeToMessage(errorCode),
          code: errorCode,
        });
      case ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID:
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
   * Mappt Rotate-Fehler auf HTTP Exceptions.
   *
   * **Error Mapping:**
   * - TOKEN_NOT_FOUND, INVALID_TOKEN_ID -> 404 Not Found
   * - NOT_ROTATABLE (revoked/expired) -> 400 Bad Request
   * - NAME_TOO_SHORT, NAME_TOO_LONG -> 400 Bad Request
   * - Technische Fehler -> 500 Internal Server Error
   *
   * @param errorCode - Technischer Error Code
   * @returns Entsprechende HTTP Exception
   */
  private mapRotateErrorToException(errorCode: string): NotFoundException | BadRequestException | InternalServerErrorException {
    switch (errorCode) {
      case ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND:
      case ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID:
        return new NotFoundException({
          statusCode: 404,
          error: 'Not Found',
          message: this.mapErrorCodeToMessage(errorCode),
          code: errorCode,
        });
      case ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE:
      case ACCESS_TOKEN_ERROR_CODES.TOKEN_REVOKED:
      case ACCESS_TOKEN_ERROR_CODES.TOKEN_EXPIRED:
      case ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT:
      case ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG:
      case ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID:
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
      [ACCESS_TOKEN_ERROR_CODES.TOKEN_NOT_FOUND]: 'Das Token wurde nicht gefunden',
      [ACCESS_TOKEN_ERROR_CODES.TOKEN_REVOKED]: 'Das Token wurde bereits widerrufen',
      [ACCESS_TOKEN_ERROR_CODES.TOKEN_EXPIRED]: 'Das Token ist abgelaufen',
      [ACCESS_TOKEN_ERROR_CODES.NOT_ROTATABLE]: 'Das Token kann nicht rotiert werden (widerrufen oder abgelaufen)',
      [ACCESS_TOKEN_ERROR_CODES.INVALID_TOKEN_ID]: 'Ungueltige Token-ID',
      [ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED]: 'Das Token konnte nicht erstellt werden',
      [ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED]: 'Das Token konnte nicht gespeichert werden',
      [ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED]: 'Fehler bei der Token-Verschluesselung',
      [ACCESS_TOKEN_ERROR_CODES.INVALID_USER_ID]: 'Ungueltige User-ID',
    };

    return errorMessages[errorCode] ?? `Ein Fehler ist aufgetreten: ${errorCode}`;
  }
}
