import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';

// Handlers
import { CreateQualifikationHandler } from '@application/kraefte/qualifikationen/commands/create-qualifikation/create-qualifikation.handler';
import { UpdateQualifikationHandler } from '@application/kraefte/qualifikationen/commands/update-qualifikation/update-qualifikation.handler';
import { DeactivateQualifikationHandler } from '@application/kraefte/qualifikationen/commands/deactivate-qualifikation/deactivate-qualifikation.handler';
import { GetAllQualifikationenHandler } from '@application/kraefte/qualifikationen/queries/get-all-qualifikationen/get-all-qualifikationen.handler';
import { GetQualifikationByIdHandler } from '@application/kraefte/qualifikationen/queries/get-qualifikation-by-id/get-qualifikation-by-id.handler';

// Commands & Queries
import { CreateQualifikationCommand } from '@application/kraefte/qualifikationen/commands/create-qualifikation/create-qualifikation.command';
import { UpdateQualifikationCommand } from '@application/kraefte/qualifikationen/commands/update-qualifikation/update-qualifikation.command';
import { DeactivateQualifikationCommand } from '@application/kraefte/qualifikationen/commands/deactivate-qualifikation/deactivate-qualifikation.command';
import { GetAllQualifikationenQuery } from '@application/kraefte/qualifikationen/queries/get-all-qualifikationen/get-all-qualifikationen.query';
import { GetQualifikationByIdQuery } from '@application/kraefte/qualifikationen/queries/get-qualifikation-by-id/get-qualifikation-by-id.query';

// DTOs
import { QualifikationDto } from '@application/kraefte/qualifikationen/dto/qualifikation.dto';
import { CreateQualifikationDto } from '@application/kraefte/qualifikationen/dto/create-qualifikation.dto';
import { UpdateQualifikationDto } from '@application/kraefte/qualifikationen/dto/update-qualifikation.dto';

// Error Codes
import { QUALIFIKATION_ERROR_CODES, QualifikationError } from '@domain/kraefte/common/error-codes';

/**
 * Admin Controller für Qualifikationen-Verwaltung.
 *
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 * Nur Admins können Qualifikationen verwalten.
 *
 * Rate Limiting (Controller-Level):
 * - Max. 20 Anfragen pro Minute pro IP (verhindert DoS-Angriffe auf Admin-Endpoints)
 * - Bei Überschreitung: 429 Too Many Requests
 * - Grund: Admin-Endpoints sind besonders sensibel und sollten nicht missbraucht werden können
 */
@ApiTags('admin-kraefte-qualifikationen')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@Controller({ path: 'admin/kraefte/qualifikationen', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
export class AdminQualifikationenController {
  private readonly logger = new Logger(AdminQualifikationenController.name);

  constructor(
    private readonly createHandler: CreateQualifikationHandler,
    private readonly updateHandler: UpdateQualifikationHandler,
    private readonly deactivateHandler: DeactivateQualifikationHandler,
    private readonly getAllHandler: GetAllQualifikationenHandler,
    private readonly getByIdHandler: GetQualifikationByIdHandler,
  ) {}

  /**
   * Alle Qualifikationen auflisten (mit optionalem Filter).
   *
   * WARUM dieser Endpoint existiert:
   * - Admin-Bereich benötigt eine Übersicht aller Qualifikationen zur Verwaltung
   * - Filter ermöglicht es, nur aktive Qualifikationen anzuzeigen (für schnelleren Überblick)
   * - Wird genutzt, um Duplikate zu erkennen (z.B. bei Erstellung neuer Qualifikationen)
   *
   * WARUM manuelle Boolean-Parsing statt ParseBoolPipe({ optional: true }):
   * - ParseBoolPipe({ optional: true }) ist keine gültige NestJS API
   * - Manuelle Transformation erlaubt undefined-Werte für optionale Parameter
   * - Explizite Validierung statt Silent-Ignore für ungültige Werte (z.B. "garbage")
   *
   * @param istAktiv - Optional: Nur aktive (true) oder inaktive (false) Qualifikationen
   * @returns Array aller Qualifikationen (sortiert nach Name)
   * @throws BadRequestException wenn istAktiv ungültigen Wert hat (nicht 'true'/'false'/undefined)
   */
  @Get()
  @ApiOperation({ summary: 'Alle Qualifikationen auflisten' })
  @ApiOkResponse({ type: QualifikationDto, isArray: true })
  @ApiQuery({ name: 'istAktiv', required: false, type: Boolean, description: 'Filter nach Aktivierungsstatus' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  @ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
  @ApiInternalServerErrorResponse({ description: 'Fehler beim Abrufen der Qualifikationen' })
  async findAll(@Query('istAktiv') istAktiv?: string): Promise<QualifikationDto[]> {
    // Parse boolean manually (undefined, 'true', 'false')
    // Validate: Only 'true', 'false', or undefined are allowed
    let parsedIstAktiv: boolean | undefined;

    if (istAktiv !== undefined) {
      if (istAktiv === 'true') {
        parsedIstAktiv = true;
      } else if (istAktiv === 'false') {
        parsedIstAktiv = false;
      } else {
        // Invalid value provided
        throw new BadRequestException(`Ungültiger Wert für 'istAktiv': '${istAktiv}'. Erlaubte Werte: 'true', 'false' oder Parameter weglassen.`);
      }
    }

    const query = new GetAllQualifikationenQuery(parsedIstAktiv);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      // Business validation errors → 400 Bad Request
      // All other errors → 500 Internal Server Error
      if (result.error?.includes('Validierung') || result.error?.includes('Ungültig')) {
        throw new BadRequestException(result.error);
      }
      throw new InternalServerErrorException(result.error);
    }

    return result.value ?? [];
  }

  /**
   * Qualifikation nach ID abrufen.
   *
   * WARUM dieser Endpoint existiert:
   * - Detail-Ansicht im Admin-Bereich für eine spezifische Qualifikation
   * - Wird benötigt, um Qualifikations-Daten zu laden (z.B. beim Öffnen des Edit-Dialogs)
   * - Validiert die Existenz einer Qualifikation, bevor sie bearbeitet wird
   *
   * WARUM differenzierte Error-Responses:
   * - 400 Bad Request: Validierungsfehler (z.B. ID-Format ungültig) → Client-Fehler
   * - 404 Not Found: Ressource existiert nicht → Resource-Fehler
   * - 500 Internal Server Error: Unerwartete Fehler → Server-Fehler
   * - Ermöglicht dem Client, unterschiedliche Error-Szenarien korrekt zu behandeln
   *
   * @param id - CUID der Qualifikation (validiert mit ParseCuidPipe)
   * @returns Die Qualifikation-Details
   * @throws NotFoundException wenn Qualifikation nicht existiert
   * @throws InternalServerErrorException bei unerwarteten Fehlern
   */
  @Get(':id')
  @ApiOperation({ summary: 'Qualifikation nach ID abrufen' })
  @ApiOkResponse({ type: QualifikationDto })
  @ApiNotFoundResponse({ description: 'Qualifikation nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige CUID' })
  @ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
  @ApiInternalServerErrorResponse({ description: 'Fehler beim Abrufen der Qualifikation' })
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<QualifikationDto> {
    const query = new GetQualifikationByIdQuery(id);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      // Unexpected errors (ID validation already handled by ParseCuidPipe)
      throw new InternalServerErrorException(result.error);
    }

    if (!result.value) {
      throw new NotFoundException(`Qualifikation mit ID '${id}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Neue Qualifikation erstellen.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, neue Qualifikationen im System anzulegen (z.B. "Atemschutzgeräteträger")
   * - Jede Qualifikation muss eine eindeutige Abkürzung haben (z.B. "AGT"), um Duplikate zu verhindern
   * - Neue Qualifikationen sind standardmäßig aktiv und können Kräften zugeordnet werden
   * - Audit Trail: Speichert createdBy für Nachvollziehbarkeit
   *
   * WARUM @HttpCode(HttpStatus.CREATED):
   * - POST-Endpoints sollten explizit 201 Created zurückgeben (nicht 200 OK)
   * - Signalisiert dem Client, dass eine neue Ressource erfolgreich erstellt wurde
   * - Entspricht REST Best Practices
   *
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Qualifikations-Daten (Name, Abkürzung, Kategorie, Beschreibung)
   * @returns Die neu erstellte Qualifikation
   * @throws BadRequestException bei Validierungsfehlern
   * @throws ConflictException wenn Abkürzung bereits vergeben ist
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neue Qualifikation erstellen' })
  @ApiCreatedResponse({ type: QualifikationDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. Name zu kurz)' })
  @ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
  @ApiConflictResponse({ description: 'Abkürzung bereits vergeben' })
  @ApiInternalServerErrorResponse({ description: 'Fehler beim Erstellen der Qualifikation' })
  async create(@CurrentUser() user: ValidatedUser, @Body() dto: CreateQualifikationDto): Promise<QualifikationDto> {
    // Create Command
    const commandResult = CreateQualifikationCommand.create({
      name: dto.name,
      abkuerzung: dto.abkuerzung,
      kategorie: dto.kategorie,
      beschreibung: dto.beschreibung,
      createdBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.createHandler.execute(command);

    if (result.isFailure) {
      // Check error code instead of string matching
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE)) {
        throw new ConflictException(QualifikationError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return created Qualifikation DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen der Qualifikation');
    }

    // Audit logging for mutation
    this.logger.log(`Qualifikation erstellt: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Qualifikation aktualisieren.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, bestehende Qualifikationen zu bearbeiten (z.B. Tippfehler korrigieren)
   * - Kann Abkürzung ändern (mit Unique-Check, um Duplikate zu verhindern)
   * - Kann Aktivierungsstatus ändern (Alternative zu Deactivate-Endpoint)
   * - Audit Trail: Speichert updatedBy und updatedAt für Nachvollziehbarkeit
   *
   * @param id - CUID der Qualifikation (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Zu aktualisierende Felder (partielles Update)
   * @returns Die aktualisierte Qualifikation
   * @throws NotFoundException wenn Qualifikation nicht existiert
   * @throws ConflictException wenn neue Abkürzung bereits vergeben ist
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Qualifikation aktualisieren' })
  @ApiOkResponse({ type: QualifikationDto })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige CUID' })
  @ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
  @ApiNotFoundResponse({ description: 'Qualifikation nicht gefunden' })
  @ApiConflictResponse({ description: 'Neue Abkürzung bereits vergeben' })
  @ApiInternalServerErrorResponse({ description: 'Fehler beim Aktualisieren der Qualifikation' })
  async update(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateQualifikationDto): Promise<QualifikationDto> {
    // Create Command
    const commandResult = UpdateQualifikationCommand.create({
      id,
      updatedBy: user.userId,
      name: dto.name,
      abkuerzung: dto.abkuerzung,
      kategorie: dto.kategorie,
      beschreibung: dto.beschreibung,
      istAktiv: dto.istAktiv,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.updateHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(QualifikationError.extractMessage(result.error));
      }
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.ABKUERZUNG_DUPLICATE)) {
        throw new ConflictException(QualifikationError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return updated Qualifikation DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren der Qualifikation');
    }

    // Audit logging for mutation
    this.logger.log(`Qualifikation aktualisiert: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Qualifikation deaktivieren (Soft-Delete).
   *
   * WARUM dieser Endpoint existiert:
   * - Qualifikationen werden NICHT gelöscht, um referentielle Integrität zu wahren
   * - Deaktivierte Qualifikationen sind nicht mehr sichtbar/nutzbar im normalen Betrieb
   * - Historische Daten bleiben erhalten (z.B. welche Kraft hatte welche Qualifikation)
   * - Kann reaktiviert werden über den Update-Endpoint (istAktiv: true)
   * - Audit Trail: Speichert wer wann deaktiviert hat
   *
   * @param id - CUID der Qualifikation (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Die deaktivierte Qualifikation
   * @throws NotFoundException wenn Qualifikation nicht existiert
   * @throws BadRequestException wenn bereits deaktiviert
   */
  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Qualifikation deaktivieren' })
  @ApiOkResponse({ type: QualifikationDto })
  @ApiBadRequestResponse({ description: 'Qualifikation ist bereits deaktiviert oder ungültige CUID' })
  @ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
  @ApiNotFoundResponse({ description: 'Qualifikation nicht gefunden' })
  @ApiInternalServerErrorResponse({ description: 'Fehler beim Deaktivieren der Qualifikation' })
  async deactivate(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<QualifikationDto> {
    // Create Command
    const commandResult = DeactivateQualifikationCommand.create({
      id,
      updatedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.deactivateHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(QualifikationError.extractMessage(result.error));
      }
      if (result.error && QualifikationError.hasCode(result.error, QUALIFIKATION_ERROR_CODES.ALREADY_DEACTIVATED)) {
        throw new BadRequestException(QualifikationError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return deactivated Qualifikation DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Deaktivieren der Qualifikation');
    }

    // Audit logging for mutation
    this.logger.log(`Qualifikation deaktiviert: ${result.value.id} (${result.value.name}) von Admin ${user.userId}`);

    return result.value;
  }
}
