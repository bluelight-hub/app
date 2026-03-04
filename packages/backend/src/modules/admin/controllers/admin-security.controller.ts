import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, HttpStatus, InternalServerErrorException, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AppConfigService } from '@/infrastructure/services/app-config.service';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

import { MigrateToSecureModeHandler } from '@/application/admin/commands/migrate-to-secure-mode.handler';
import { MigrateToSecureModeCommand } from '@/application/admin/commands/migrate-to-secure-mode.command';
import { GetSecurityStatusHandler } from '@/application/admin/queries/get-security-status.handler';
import { GetSecurityStatusQuery } from '@/application/admin/queries/get-security-status.query';
import { SecurityStatusDto } from '@/application/admin/dto/security-status.dto';
import { ConfigDoctorDto } from '@/application/admin/dto/runtime-config.dto';
import { MigrateToSecureModeRequestDto, MigrateToSecureModeResponseDto } from '@/application/admin/dto/migrate-to-secure-mode.dto';
import { SECURITY_ERROR_CODES } from '@/application/admin/errors/security-error.codes';
import { ACCESS_TOKEN_ERROR_CODES } from '@/application/admin/errors/access-token-error.codes';

/**
 * Controller fuer Admin Security-Mode Operationen.
 *
 * Erfordert Admin-Rolle (ADMIN oder SUPER_ADMIN) via AdminJwtAuthGuard.
 * Stellt Endpoints zur Verwaltung des Server-Security-Modus bereit.
 *
 * **Story 4.6 - INSECURE zu SECURE Migration:**
 * - AC2: `POST /admin/security/migrate-to-secure` fuer Migration
 * - AC3: HTTP 409 wenn bereits im SECURE Mode
 *
 * **Endpoints:**
 * - `GET /admin/security/status`: Security-Status abfragen
 * - `POST /admin/security/migrate-to-secure`: Zu SECURE Mode migrieren
 *
 * **Rate Limiting:**
 * - POST /migrate-to-secure: Max 5 Anfragen pro Minute
 * - Verhindert Brute-Force auf die kritische Migration
 *
 * **Security:**
 * - Nur authentifizierte Admins koennen Security-Mode aendern
 * - Migration ist IRREVERSIBEL - Server kann nicht zu INSECURE zurueck
 * - Initial-Token wird mit bcrypt gehasht gespeichert
 * - Das Klartext-Token ist NUR in der Migration-Response sichtbar
 *
 * @example
 * ```bash
 * # Status abfragen
 * curl http://localhost:3091/api/admin/security/status \
 *   -H "Cookie: adminToken=..."
 *
 * # Zu SECURE Mode migrieren
 * curl -X POST http://localhost:3091/api/admin/security/migrate-to-secure \
 *   -H "Content-Type: application/json" \
 *   -H "Cookie: adminToken=..." \
 *   -d '{"tokenName": "Primary Server Token"}'
 * ```
 */
@Controller({ path: 'admin/security', version: 'alpha' })
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - Admin-Login erforderlich' })
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
export class AdminSecurityController {
  constructor(
    private readonly migrateHandler: MigrateToSecureModeHandler,
    private readonly statusHandler: GetSecurityStatusHandler,
    private readonly appConfig: AppConfigService,
  ) {}

  @Get('doctor')
  @ApiOperation({
    summary: 'Config-Doctor Diagnostik',
    description: 'Prüft Runtime-Konfiguration: fehlende Pflichtkeys, aktive ENV-Overrides und Entschlüsselbarkeit. Keine Secret-Klartexte in der Antwort.',
  })
  @ApiWrappedResponse(ConfigDoctorDto, {
    description: 'Diagnostik erfolgreich erstellt',
  })
  getConfigDoctor(): ConfigDoctorDto {
    const report = this.appConfig.getConfigDoctorReport();
    return {
      dbAvailable: report.dbAvailable,
      dbAvailabilityReasons: report.dbAvailabilityReasons,
      missingRequiredKeys: report.missingRequiredKeys,
      activeEnvOverrides: report.activeEnvOverrides,
      legacyEnvFallbackKeys: report.legacyEnvFallbackKeys,
      legacyEnvCleanupKeys: report.legacyEnvCleanupKeys,
      decryptionErrors: report.decryptionErrors,
      runtimeConfigCount: report.runtimeConfigCount,
      runtimeSecretCount: report.runtimeSecretCount,
    };
  }

  /**
   * Ruft den aktuellen Security-Status des Servers ab.
   *
   * Gibt Informationen ueber den aktuellen Security-Mode,
   * Setup-Status und Anzahl aktiver Tokens zurueck.
   *
   * **Use Cases (Story 4.6):**
   * - AC1: INSECURE Mode Status pruefen
   * - AC5: Setup-Completion Status pruefen
   * - AC6: Active Token Count fuer Migration-Entscheidung
   *
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns SecurityStatusDto mit aktuellem Security-Status
   */
  @Get('status')
  @ApiOperation({
    summary: 'Security-Status abfragen',
    description: 'Gibt den aktuellen Security-Mode des Servers zurueck (INSECURE/SECURE), Setup-Status und Anzahl aktiver Tokens.',
  })
  @ApiWrappedResponse(SecurityStatusDto, {
    description: 'Security-Status erfolgreich abgerufen',
  })
  async getStatus(@CurrentUser() user: ValidatedUser): Promise<SecurityStatusDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Query erstellen mit Validierung
    // ════════════════════════════════════════════════════════════════════════
    const queryResult = GetSecurityStatusQuery.create({
      requestedById: user.userId,
    });

    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: queryResult.error ?? 'Ungueltige Query-Parameter',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 2. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.statusHandler.execute(queryResult.value);

    if (result.isFailure || !result.value) {
      throw new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: result.error ?? 'Fehler beim Abrufen des Security-Status',
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // 3. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Migriert den Server von INSECURE zu SECURE Mode.
   *
   * Diese Operation ist IRREVERSIBEL! Nach erfolgreicher Migration
   * erfordert der Server ein gueltiges Access-Token fuer alle
   * Server-Operationen.
   *
   * Ein neues Initial-Token wird erstellt und zurueckgegeben.
   * WICHTIG: Das Klartext-Token ist NUR in dieser Response sichtbar
   * und kann spaeter NICHT erneut abgerufen werden!
   *
   * **Rate Limit:** 5 Anfragen pro Minute (streng, da kritische Operation)
   *
   * @param dto - MigrateToSecureModeRequestDto mit optionalem tokenName
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns MigrateToSecureModeResponseDto mit Initial-Token
   * @throws ConflictException wenn Server bereits im SECURE Mode
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Post('migrate-to-secure')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Zu SECURE Mode migrieren',
    description: 'Migriert den Server irreversibel von INSECURE zu SECURE Mode. Erstellt ein Initial-Token das NUR in dieser Response sichtbar ist! Rate-Limit: 5/Minute.',
  })
  @ApiWrappedCreatedResponse(MigrateToSecureModeResponseDto, {
    description: 'Migration erfolgreich. WICHTIG: Initial-Token nur hier sichtbar!',
  })
  @ApiBadRequestResponse({ description: 'Validierung fehlgeschlagen (tokenName Laenge)' })
  @ApiConflictResponse({ description: 'Server ist bereits im SECURE Mode' })
  @ApiTooManyRequestsResponse({ description: 'Rate-Limit ueberschritten (5/Minute)' })
  async migrateToSecure(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: MigrateToSecureModeRequestDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<MigrateToSecureModeResponseDto> {
    // ════════════════════════════════════════════════════════════════════════
    // 1. Default tokenName setzen falls nicht angegeben
    // ════════════════════════════════════════════════════════════════════════
    const tokenName = dto.tokenName ?? 'Primary Access Token';

    // ════════════════════════════════════════════════════════════════════════
    // 2. Command erstellen mit Validierung (inkl. requestedById fuer Audit-Trail)
    // ════════════════════════════════════════════════════════════════════════
    const commandResult = MigrateToSecureModeCommand.create({
      tokenName,
      requestedById: user.userId,
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
    // 3. Handler ausfuehren
    // ════════════════════════════════════════════════════════════════════════
    const result = await this.migrateHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw this.mapErrorToException(result.error ?? 'UNKNOWN_ERROR');
    }

    // ════════════════════════════════════════════════════════════════════════
    // 4. Success Response (wird durch TransformInterceptor gewrappt)
    // ════════════════════════════════════════════════════════════════════════
    return result.value;
  }

  /**
   * Mappt Error Codes zu HTTP Exceptions.
   *
   * WARUM: ALREADY_IN_SECURE_MODE -> 409 Conflict (AC3)
   * Andere Fehler -> BadRequest oder InternalServerError
   *
   * @param errorCode - Technischer Error Code
   * @returns Entsprechende HTTP Exception
   */
  private mapErrorToException(errorCode: string): ConflictException | BadRequestException | InternalServerErrorException {
    switch (errorCode) {
      // AC3: 409 Conflict wenn bereits im SECURE Mode
      case SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE:
        return new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          message: 'Server ist bereits im SECURE Mode. Migration nicht moeglich.',
          code: errorCode,
        });

      // Token-Name Validierungsfehler -> 400 Bad Request
      case ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY:
      case ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT:
      case ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG:
        return new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: this.mapErrorCodeToMessage(errorCode),
          code: errorCode,
        });

      // Config/Token Fehler -> 500 Internal Server Error
      case SECURITY_ERROR_CODES.CONFIG_NOT_FOUND:
      case SECURITY_ERROR_CODES.CONFIG_UPDATE_FAILED:
      case SECURITY_ERROR_CODES.TOKEN_GENERATION_FAILED:
      case SECURITY_ERROR_CODES.MIGRATION_FAILED:
      case ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED:
      case ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED:
      case ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED:
        return new InternalServerErrorException({
          statusCode: 500,
          error: 'Internal Server Error',
          message: this.mapErrorCodeToMessage(errorCode),
          code: errorCode,
        });

      // Unknown -> 500 Internal Server Error
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
   * WARUM: Error Codes sind technisch, aber die Fehlermeldung
   * sollte fuer den Benutzer verstaendlich sein.
   *
   * @param errorCode - Technischer Error Code
   * @returns Benutzerfreundliche Fehlermeldung
   */
  private mapErrorCodeToMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      // Security Error Codes
      [SECURITY_ERROR_CODES.ALREADY_IN_SECURE_MODE]: 'Server ist bereits im SECURE Mode',
      [SECURITY_ERROR_CODES.CONFIG_NOT_FOUND]: 'Server-Konfiguration konnte nicht geladen werden',
      [SECURITY_ERROR_CODES.CONFIG_UPDATE_FAILED]: 'Server-Konfiguration konnte nicht aktualisiert werden',
      [SECURITY_ERROR_CODES.TOKEN_GENERATION_FAILED]: 'Token-Generierung fehlgeschlagen',
      [SECURITY_ERROR_CODES.MIGRATION_FAILED]: 'Migration fehlgeschlagen',
      [SECURITY_ERROR_CODES.INVALID_TOKEN_NAME]: 'Ungueltiger Token-Name',

      // Access Token Error Codes (for tokenName validation)
      [ACCESS_TOKEN_ERROR_CODES.NAME_EMPTY]: 'Der Token-Name darf nicht leer sein',
      [ACCESS_TOKEN_ERROR_CODES.NAME_TOO_SHORT]: 'Der Token-Name muss mindestens 3 Zeichen lang sein',
      [ACCESS_TOKEN_ERROR_CODES.NAME_TOO_LONG]: 'Der Token-Name darf maximal 50 Zeichen lang sein',
      [ACCESS_TOKEN_ERROR_CODES.CREATION_FAILED]: 'Token konnte nicht erstellt werden',
      [ACCESS_TOKEN_ERROR_CODES.SAVE_FAILED]: 'Token konnte nicht gespeichert werden',
      [ACCESS_TOKEN_ERROR_CODES.TOKEN_HASH_FAILED]: 'Fehler bei der Token-Verschluesselung',
    };

    return errorMessages[errorCode] ?? `Ein Fehler ist aufgetreten: ${errorCode}`;
  }
}
