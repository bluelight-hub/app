import { Controller, Get, Patch, Body, Param, ParseIntPipe, UseGuards, NotFoundException, BadRequestException, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiNotFoundResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiParam, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { GetAllFunkStatusConfigsHandler } from '@application/kraefte/funkstatus/queries/get-all-funk-status-configs.handler';
import { GetFunkStatusConfigByCodeHandler } from '@application/kraefte/funkstatus/queries/get-funk-status-config-by-code.handler';
import { UpdateFunkStatusConfigHandler } from '@application/kraefte/funkstatus/commands/update-funk-status-config/update-funk-status-config.handler';

// Commands
import { UpdateFunkStatusConfigCommand } from '@application/kraefte/funkstatus/commands/update-funk-status-config/update-funk-status-config.command';

// DTOs
import { FunkStatusConfigDto } from '@application/kraefte/funkstatus/dto/funk-status-config.dto';
import { UpdateFunkStatusConfigDto } from '@application/kraefte/funkstatus/dto/update-funk-status-config.dto';

// Error Codes
import { FUNKSTATUS_ERROR_CODES, FunkStatusError } from '@domain/kraefte/common/error-codes';

// Validation Constants
import { FUNKSTATUS_VALIDATION } from '@domain/kraefte/constants/funkstatus-validation.constants';

/**
 * Admin Controller für FunkStatusConfig-Verwaltung.
 *
 * **Config-Only Pattern:**
 * - NUR GET und PATCH Endpoints - KEIN POST oder DELETE!
 * - Funkstatus werden via Seed erstellt (10 Status nach DIN 14610)
 * - Status 0-6 sind system-definiert (read-only)
 * - Status 7-9 sind regional anpassbar (editierbar)
 *
 * **Route-Design:**
 * - Verwendet `:code` (Integer 0-9) als Parameter, nicht `:id` (UUID)
 * - code ist der Business Key (Admin kennt "Status 7", nicht CUID2)
 */
@ApiTags('admin-kraefte-funkstatus')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'admin/kraefte/funkstatus', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminFunkStatusController {
  constructor(
    private readonly getAllHandler: GetAllFunkStatusConfigsHandler,
    private readonly getByCodeHandler: GetFunkStatusConfigByCodeHandler,
    private readonly updateHandler: UpdateFunkStatusConfigHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle Funkstatus-Konfigurationen abrufen.
   *
   * Gibt alle 10 Status (0-9) zurück, sortiert nach Code.
   * Status 0-6 sind read-only (DIN-Standard), Status 7-9 sind editierbar.
   *
   * @returns Array aller FunkStatusConfig Einträge
   */
  @Get()
  @ApiOperation({ summary: 'Alle Funkstatus-Konfigurationen abrufen' })
  @ApiWrappedResponse(FunkStatusConfigDto, { isArray: true, description: 'Liste aller konfigurierten FMS-Status' })
  async findAll(): Promise<FunkStatusConfigDto[]> {
    const result = await this.getAllHandler.execute();

    if (result.isFailure) {
      this.logger.error(`Error fetching all FunkStatusConfig: ${result.error}`);
      throw new BadRequestException('Fehler beim Abrufen der Funkstatus-Konfigurationen');
    }

    return result.value ?? [];
  }

  /**
   * Einzelnen Funkstatus nach Code abrufen.
   *
   * @param code - Der Status-Code (0-9)
   * @returns FunkStatusConfig für den angegebenen Code
   * @throws NotFoundException wenn Code nicht existiert
   * @throws BadRequestException wenn Code außerhalb 0-9 liegt
   */
  @Get(':code')
  @ApiOperation({ summary: 'Funkstatus nach Code abrufen' })
  @ApiParam({ name: 'code', type: Number, description: 'Status-Code (0-9)', example: 7 })
  @ApiWrappedResponse(FunkStatusConfigDto, { description: 'FMS-Status gefunden' })
  @ApiNotFoundResponse({ description: 'Funkstatus nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültiger Code (muss 0-9 sein)' })
  async findByCode(@Param('code', ParseIntPipe) code: number): Promise<FunkStatusConfigDto> {
    // Validate code range (Defense in Depth - Handler validiert auch)
    if (code < FUNKSTATUS_VALIDATION.CODE_MIN || code > FUNKSTATUS_VALIDATION.CODE_MAX) {
      throw new BadRequestException(`Code muss zwischen ${FUNKSTATUS_VALIDATION.CODE_MIN} und ${FUNKSTATUS_VALIDATION.CODE_MAX} liegen`);
    }

    const result = await this.getByCodeHandler.execute(code);

    if (result.isFailure) {
      this.logger.error(`Error fetching FunkStatusConfig by code ${code}: ${result.error}`);
      throw new BadRequestException('Fehler beim Abrufen der Funkstatus-Konfiguration');
    }

    if (!result.value) {
      throw new NotFoundException(`Funkstatus mit Code '${code}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Funkstatus-Konfiguration aktualisieren (nur Code 7-9 editierbar).
   *
   * **Business Rules:**
   * - Status 0-6 sind system-definiert (read-only) → 400 Bad Request
   * - Status 7-9 sind editierbar (customLabel, farbe, istAlarmierbar, beschreibung)
   * - code und standardLabel können NIE geändert werden
   *
   * @param code - Der Status-Code (7-9)
   * @param user - Aktueller Admin-Benutzer (für Audit-Trail)
   * @param dto - Zu aktualisierende Felder
   * @returns Aktualisierte FunkStatusConfig
   * @throws BadRequestException wenn Code 0-6 (read-only) oder Validierungsfehler
   * @throws NotFoundException wenn Code nicht existiert
   */
  @Patch(':code')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Funkstatus konfigurieren (nur Code 7-9)' })
  @ApiParam({ name: 'code', type: Number, description: 'Status-Code (7-9)', example: 7 })
  @ApiWrappedResponse(FunkStatusConfigDto, { description: 'FMS-Status erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder Code 0-6 (read-only)' })
  @ApiNotFoundResponse({ description: 'Funkstatus nicht gefunden' })
  async update(@Param('code', ParseIntPipe) code: number, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateFunkStatusConfigDto): Promise<FunkStatusConfigDto> {
    // Create command
    const commandResult = UpdateFunkStatusConfigCommand.create({
      code,
      customLabel: dto.customLabel,
      farbe: dto.farbe,
      istAlarmierbar: dto.istAlarmierbar,
      beschreibung: dto.beschreibung,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    // Execute command
    const result = await this.updateHandler.execute(command);

    if (result.isFailure) {
      const error = result.error;

      // Check specific error codes
      if (error && FunkStatusError.hasCode(error, FUNKSTATUS_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(FunkStatusError.extractMessage(error));
      }

      if (error && FunkStatusError.hasCode(error, FUNKSTATUS_ERROR_CODES.CODE_READ_ONLY)) {
        throw new BadRequestException(FunkStatusError.extractMessage(error));
      }

      if (error && FunkStatusError.hasCode(error, FUNKSTATUS_ERROR_CODES.INVALID_COLOR_FORMAT)) {
        throw new BadRequestException(FunkStatusError.extractMessage(error));
      }

      throw new BadRequestException(error ?? 'Fehler beim Aktualisieren');
    }

    if (!result.value) {
      throw new BadRequestException('Fehler beim Aktualisieren der Funkstatus-Konfiguration');
    }

    // Audit logging
    this.logger.log(`FunkStatusConfig aktualisiert: Code ${code} von Admin ${user.userId}`);

    return result.value;
  }

  // ❌ KEIN @Post() - Funkstatus werden via Seed erstellt
  // ❌ KEIN @Delete() - Funkstatus sind permanente System-Codes
}
