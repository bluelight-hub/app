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
  Inject,
} from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
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
import { ApiWrappedResponse, ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
import { ADMIN_RATE_LIMIT, ADMIN_MUTATION_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';

// Handlers
import { CreateStammPersonHandler } from '@application/kraefte/stamm-personen/commands/create-stamm-person/create-stamm-person.handler';
import { UpdateStammPersonHandler } from '@application/kraefte/stamm-personen/commands/update-stamm-person/update-stamm-person.handler';
import { ArchiveStammPersonHandler } from '@application/kraefte/stamm-personen/commands/archive-stamm-person/archive-stamm-person.handler';
import { RestoreStammPersonHandler } from '@application/kraefte/stamm-personen/commands/restore-stamm-person/restore-stamm-person.handler';
import { GetAllStammPersonenHandler } from '@application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.handler';
import { GetStammPersonByIdHandler } from '@application/kraefte/stamm-personen/queries/get-stamm-person-by-id/get-stamm-person-by-id.handler';

// Commands & Queries
import { CreateStammPersonCommand } from '@application/kraefte/stamm-personen/commands/create-stamm-person/create-stamm-person.command';
import { UpdateStammPersonCommand } from '@application/kraefte/stamm-personen/commands/update-stamm-person/update-stamm-person.command';
import { ArchiveStammPersonCommand } from '@application/kraefte/stamm-personen/commands/archive-stamm-person/archive-stamm-person.command';
import { RestoreStammPersonCommand } from '@application/kraefte/stamm-personen/commands/restore-stamm-person/restore-stamm-person.command';
import { GetAllStammPersonenQuery } from '@application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.query';
import { GetStammPersonByIdQuery } from '@application/kraefte/stamm-personen/queries/get-stamm-person-by-id/get-stamm-person-by-id.query';

// DTOs
import { StammPersonDto } from '@application/kraefte/stamm-personen/dto/stamm-person.dto';
import { CreateStammPersonDto } from '@application/kraefte/stamm-personen/dto/create-stamm-person.dto';
import { UpdateStammPersonDto } from '@application/kraefte/stamm-personen/dto/update-stamm-person.dto';

// Error Codes
import { STAMM_PERSON_ERROR_CODES, StammPersonError } from '@domain/kraefte/common/stamm-person-error-codes';

/**
 * Admin Controller für Stamm-Personen-Verwaltung.
 *
 * Alle Endpoints sind mit AdminJwtAuthGuard geschützt.
 * Nur Admins können Stamm-Personen verwalten.
 *
 * **Authorization Design:**
 * - WARUM keine createdBy/updatedBy Prüfung gegen aktuellen User:
 *   - Admin darf ALLE Personen verwalten (unabhängig davon, wer sie erstellt hat)
 *   - createdBy/updatedBy sind NUR für Audit-Trail (Nachvollziehbarkeit)
 *   - Keine Ownership-basierte Autorisierung auf Personen-Ebene
 *   - Personen sind globale Stammdaten (keine User-spezifischen Ressourcen)
 *   - AdminJwtAuthGuard stellt sicher, dass nur Admins überhaupt Zugriff haben
 *
 * **Archive-Pattern (Soft-Delete) mit Restore:**
 * - Personen werden NIEMALS physisch gelöscht (referentielle Integrität)
 * - Archivierte Personen: archivedAt + archivedBy gesetzt
 * - Default-Listen blenden archivierte Personen aus
 * - includeArchived Query-Parameter zeigt auch archivierte Personen
 * - RESTORE: Im Gegensatz zu Fahrzeugen können Personen wiederherstellt werden (AC8)
 * - Grund: Personalfluktuation - ausgeschiedene Mitarbeiter können zurückkehren
 *
 * **IMMUTABLE Personalnummer:**
 * - Personalnummer kann nach Erstellung NICHT geändert werden
 * - Grund: Personalnummer ist ein eindeutiges Merkmal (wie Personalausweis-Nummer)
 * - Bei Änderung: alte Person archivieren, neue Person mit neuer Personalnummer anlegen
 *
 * **Archived Person Modification (AC9):**
 * - Archivierte Personen können NICHT bearbeitet werden (nur wiederherstellen)
 * - Verhindert inkonsistente Zustände (z.B. archiviert aber mit neuen Qualifikationen)
 * - Workflow: Zuerst wiederherstellen (restore), dann bearbeiten (update)
 *
 * Rate Limiting (Controller-Level):
 * - GET-Endpoints: Max. 30 Anfragen pro Minute (Lese-Operationen)
 * - Mutationen (POST/PATCH): Max. 10 Anfragen pro Minute (Schreib-Operationen)
 * - Bei Überschreitung: 429 Too Many Requests
 * - Grund: Admin-Endpoints sind besonders sensibel und sollten nicht missbraucht werden können
 */
@ApiTags('admin-stammdaten-personen')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'admin/stammdaten/personen', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminStammPersonenController {
  constructor(
    private readonly createHandler: CreateStammPersonHandler,
    private readonly updateHandler: UpdateStammPersonHandler,
    private readonly archiveHandler: ArchiveStammPersonHandler,
    private readonly restoreHandler: RestoreStammPersonHandler,
    private readonly getAllHandler: GetAllStammPersonenHandler,
    private readonly getByIdHandler: GetStammPersonByIdHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle Stamm-Personen auflisten (mit optionalem Archive-Filter).
   *
   * WARUM dieser Endpoint existiert:
   * - Admin-Bereich benötigt eine Übersicht aller Personen zur Verwaltung
   * - Filter ermöglicht es, nur aktive Personen anzuzeigen (für schnelleren Überblick)
   * - Wird genutzt, um Duplikate zu erkennen (z.B. bei Erstellung neuer Personen)
   * - Qualifikationen-Relation wird eager loaded (vermeidet N+1 Problem)
   *
   * WARUM manuelle Boolean-Parsing statt ParseBoolPipe({ optional: true }):
   * - ParseBoolPipe({ optional: true }) ist keine gültige NestJS API
   * - Manuelle Transformation erlaubt undefined-Werte für optionale Parameter
   * - Explizite Validierung statt Silent-Ignore für ungültige Werte (z.B. "garbage")
   *
   * @param includeArchived - Optional: Auch archivierte Personen anzeigen (default: false)
   * @returns Array aller Stamm-Personen (sortiert nach nachname, vorname)
   * @throws BadRequestException wenn includeArchived ungültigen Wert hat (nicht 'true'/'false'/undefined)
   */
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // AC7: GET 30/min (überschreibt Klassen-Level 20/min)
  @ApiOperation({ summary: 'Alle Stamm-Personen auflisten' })
  @ApiWrappedResponse(StammPersonDto, { isArray: true, description: 'Liste aller Stamm-Personen' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Archivierte Personen einschließen' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('includeArchived') includeArchived?: string): Promise<StammPersonDto[]> {
    // Parse boolean manually (undefined, 'true', 'false')
    // Validate: Only 'true', 'false', or undefined are allowed
    let parsedIncludeArchived: boolean | undefined;

    if (includeArchived !== undefined) {
      if (includeArchived === 'true') {
        parsedIncludeArchived = true;
      } else if (includeArchived === 'false') {
        parsedIncludeArchived = false;
      } else {
        // Invalid value provided
        // SECURITY: User-Input NICHT zurück an Client senden (XSS/Injection Prevention)
        this.logger.warn(`Invalid includeArchived value received: '${includeArchived}'`);
        throw new BadRequestException("Ungültiger Wert für 'includeArchived'. Erlaubte Werte: 'true', 'false' oder Parameter weglassen.");
      }
    }

    const query = new GetAllStammPersonenQuery(parsedIncludeArchived);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      // WARUM String-Matching statt Error-Code-Check:
      // - Result Pattern gibt nur generische Fehlermeldungen zurück (kein Error-Code-System)
      // - Diese Query hat keine spezifischen Error-Codes definiert (nur generische Messages)
      // - String-Matching ist hier der einzige Weg, um Business-Errors von Infrastruktur-Errors zu unterscheiden
      // - Alternative wäre Domain-Error-Codes wie in Create/Update/Archive Handlers
      //
      // Business validation errors → 400 Bad Request
      // All other errors → 500 Internal Server Error
      //
      // SECURITY: result.error wird NICHT direkt an Client weitergegeben (Information Disclosure Risk)
      // Stattdessen: Generische Fehlermeldung für Client, Details nur in Server-Logs
      if (result.error?.includes('Validierung') || result.error?.includes('Ungültig')) {
        this.logger.warn(`Validation error in findAll: ${result.error}`);
        throw new BadRequestException('Ungültige Filterparameter');
      }
      this.logger.error(`Unexpected error in findAll: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der Stamm-Personen');
    }

    return result.value ?? [];
  }

  /**
   * Stamm-Person nach ID abrufen.
   *
   * WARUM dieser Endpoint existiert:
   * - Detail-Ansicht im Admin-Bereich für eine spezifische Person
   * - Wird benötigt, um Personen-Daten zu laden (z.B. beim Öffnen des Edit-Dialogs)
   * - Validiert die Existenz einer Person, bevor sie bearbeitet wird
   * - Qualifikationen-Relation wird eager loaded
   *
   * WARUM differenzierte Error-Responses:
   * - 400 Bad Request: Validierungsfehler (z.B. ID-Format ungültig) → Client-Fehler
   * - 404 Not Found: Ressource existiert nicht → Resource-Fehler
   * - 500 Internal Server Error: Unerwartete Fehler → Server-Fehler
   * - Ermöglicht dem Client, unterschiedliche Error-Szenarien korrekt zu behandeln
   *
   * @param id - CUID der Stamm-Person (validiert mit ParseCuidPipe)
   * @returns Die Stamm-Personen-Details
   * @throws NotFoundException wenn Stamm-Person nicht existiert
   * @throws InternalServerErrorException bei unerwarteten Fehlern
   */
  @Get(':id')
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // AC7: GET 30/min (überschreibt Klassen-Level 20/min)
  @ApiOperation({ summary: 'Stamm-Person nach ID abrufen' })
  @ApiWrappedResponse(StammPersonDto, { description: 'Stamm-Person gefunden' })
  @ApiNotFoundResponse({ description: 'Stamm-Person nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige CUID' })
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<StammPersonDto> {
    const query = new GetStammPersonByIdQuery(id);
    const result = await this.getByIdHandler.execute(query);

    if (result.isFailure) {
      // Unexpected errors (ID validation already handled by ParseCuidPipe)
      // SECURITY: Interne Fehlermeldungen nicht an Client leaken (Information Disclosure)
      this.logger.error(`Unexpected error in findOne for ID ${id}: ${result.error}`);
      throw new InternalServerErrorException('Fehler beim Abrufen der Stamm-Person');
    }

    if (!result.value) {
      throw new NotFoundException(`Stamm-Person mit ID '${id}' nicht gefunden`);
    }

    return result.value;
  }

  /**
   * Neue Stamm-Person erstellen.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, neue Personen im System anzulegen (z.B. "Max Mustermann")
   * - Jede Person muss eine eindeutige Personalnummer haben, um Duplikate zu verhindern
   * - Qualifikationen müssen bereits existieren (FK-Validierung)
   * - Neue Personen sind standardmäßig NICHT archiviert
   * - Audit Trail: Speichert createdBy für Nachvollziehbarkeit
   *
   * WARUM @HttpCode(HttpStatus.CREATED):
   * - POST-Endpoints sollten explizit 201 Created zurückgeben (nicht 200 OK)
   * - Signalisiert dem Client, dass eine neue Ressource erfolgreich erstellt wurde
   * - Entspricht REST Best Practices
   *
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Stamm-Personen-Daten (vorname, nachname, personalnummer, qualifikationIds?, funkrufname?, funkkennungBOS?)
   * @returns Die neu erstellte Stamm-Person
   * @throws BadRequestException bei Validierungsfehlern oder nicht-existenten Qualifikationen
   * @throws ConflictException wenn Personalnummer bereits vergeben ist
   */
  @Post()
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Neue Stamm-Person erstellen' })
  @ApiWrappedCreatedResponse(StammPersonDto, { description: 'Stamm-Person erfolgreich erstellt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler (z.B. Name zu kurz, Qualifikation existiert nicht)' })
  @ApiConflictResponse({ description: 'Personalnummer bereits vergeben' })
  async create(@CurrentUser() user: ValidatedUser, @Body() dto: CreateStammPersonDto): Promise<StammPersonDto> {
    // Create Command
    const commandResult = CreateStammPersonCommand.create({
      vorname: dto.vorname,
      nachname: dto.nachname,
      personalnummer: dto.personalnummer,
      qualifikationIds: dto.qualifikationIds,
      funkkenungBOS: dto.funkkenungBOS,
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
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.PERSONALNUMMER_DUPLICATE)) {
        throw new ConflictException(StammPersonError.extractMessage(result.error));
      }
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.INVALID_QUALIFIKATION)) {
        throw new BadRequestException(StammPersonError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return created Stamm-Person DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Erstellen der Stamm-Person');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Person erstellt: ${result.value.id} (${result.value.vorname} ${result.value.nachname}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Stamm-Person aktualisieren.
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht Admins, bestehende Personen zu bearbeiten (z.B. neue Qualifikationen hinzufügen)
   * - Kann Vorname, Nachname, Qualifikationen, Funkrufname, Funkkennung ändern
   * - IMMUTABLE: personalnummer kann NICHT geändert werden (bei Änderung: archivieren + neu anlegen)
   * - VERHINDERT: Bearbeitung archivierter Personen (AC9 - ARCHIVED_PERSON_MODIFICATION)
   * - Audit Trail: Speichert updatedBy und updatedAt für Nachvollziehbarkeit
   *
   * WARUM archivierte Personen nicht bearbeitbar sind (AC9):
   * - Verhindert inkonsistente Zustände (z.B. archiviert aber mit neuen Qualifikationen)
   * - Klare Semantik: Archivierung = "nicht mehr aktiv" → keine Änderungen möglich
   * - Workflow: Zuerst wiederherstellen (restore), dann bearbeiten (update)
   *
   * @param id - CUID der Stamm-Person (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @param dto - Zu aktualisierende Felder (partielles Update, alle Felder optional)
   * @returns Die aktualisierte Stamm-Person
   * @throws NotFoundException wenn Stamm-Person nicht existiert
   * @throws ConflictException wenn archivierte Person bearbeitet werden soll (AC9)
   * @throws BadRequestException bei Validierungsfehlern oder nicht-existenten Qualifikationen
   */
  @Patch(':id')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Stamm-Person aktualisieren' })
  @ApiWrappedResponse(StammPersonDto, { description: 'Stamm-Person erfolgreich aktualisiert' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Stamm-Person nicht gefunden' })
  @ApiConflictResponse({ description: 'Archivierte Person kann nicht bearbeitet werden (erst wiederherstellen)' })
  async update(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser, @Body() dto: UpdateStammPersonDto): Promise<StammPersonDto> {
    // Create Command
    const commandResult = UpdateStammPersonCommand.create({
      id,
      updatedBy: user.userId,
      vorname: dto.vorname,
      nachname: dto.nachname,
      qualifikationIds: dto.qualifikationIds,
      funkkenungBOS: dto.funkkenungBOS,
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
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(StammPersonError.extractMessage(result.error));
      }
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.ARCHIVED_PERSON_MODIFICATION)) {
        throw new ConflictException(StammPersonError.extractMessage(result.error)); // AC9: 409 Conflict
      }
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.INVALID_QUALIFIKATION)) {
        throw new BadRequestException(StammPersonError.extractMessage(result.error));
      }
      throw new BadRequestException(result.error);
    }

    // Return updated Stamm-Person DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Aktualisieren der Stamm-Person');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Person aktualisiert: ${result.value.id} (${result.value.vorname} ${result.value.nachname}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Stamm-Person archivieren (Soft-Delete).
   *
   * WARUM dieser Endpoint existiert:
   * - Stamm-Personen werden NICHT gelöscht, um referentielle Integrität zu wahren
   * - Archivierte Personen sind nicht mehr sichtbar/nutzbar im normalen Betrieb
   * - Historische Daten bleiben erhalten (z.B. welche Person war bei welchem Einsatz)
   * - KANN reaktiviert werden (restore) - im Gegensatz zu Fahrzeugen
   * - Audit Trail: Speichert wer wann archiviert hat
   *
   * WARUM Personen wiederherstellbar sind (im Gegensatz zu Fahrzeugen):
   * - Personalfluktuation: Mitarbeiter können die Organisation verlassen und zurückkehren
   * - Beispiel: Ehrenamtler pausiert 1 Jahr, kehrt dann zurück
   * - Fahrzeuge: Bei Umrüstung/Verkauf macht Wiederherstellung keinen Sinn
   *
   * @param id - CUID der Stamm-Person (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Die archivierte Stamm-Person
   * @throws NotFoundException wenn Stamm-Person nicht existiert
   * @throws ConflictException wenn bereits archiviert (AC8)
   */
  @Patch(':id/archive')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Stamm-Person archivieren' })
  @ApiWrappedResponse(StammPersonDto, { description: 'Stamm-Person erfolgreich archiviert' })
  @ApiConflictResponse({ description: 'Stamm-Person ist bereits archiviert oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Stamm-Person nicht gefunden' })
  async archive(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<StammPersonDto> {
    // Create Command
    const commandResult = ArchiveStammPersonCommand.create({
      id,
      archivedBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.archiveHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(StammPersonError.extractMessage(result.error));
      }
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.ALREADY_ARCHIVED)) {
        throw new ConflictException(StammPersonError.extractMessage(result.error)); // AC8: 409 Conflict (Zustandskonflikt)
      }
      throw new BadRequestException(result.error);
    }

    // Return archived Stamm-Person DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Archivieren der Stamm-Person');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Person archiviert: ${result.value.id} (${result.value.vorname} ${result.value.nachname}) von Admin ${user.userId}`);

    return result.value;
  }

  /**
   * Archivierte Stamm-Person wiederherstellen (AC8).
   *
   * WARUM dieser Endpoint existiert:
   * - Ermöglicht die Reaktivierung archivierter Personen (z.B. bei Rückkehr)
   * - Setzt archivedAt und archivedBy auf null (Person wird wieder "aktiv")
   * - Speichert wer die Person wiederhergestellt hat (restoredBy/restoredAt)
   * - Audit Trail: Nachvollziehbarkeit der Wiederherstellung
   *
   * WARUM nur für Personen, nicht für Fahrzeuge:
   * - Personalfluktuation: Mitarbeiter können zurückkehren (z.B. nach Pause)
   * - Fahrzeuge: Umrüstung/Verkauf ist meist permanent → kein Restore sinnvoll
   * - Use-Case: "Max Mustermann war 2 Jahre inaktiv, ist jetzt wieder im Dienst"
   *
   * @param id - CUID der Stamm-Person (validiert mit ParseCuidPipe)
   * @param user - Aktueller Admin-Benutzer (aus JWT Token)
   * @returns Die wiederhergestellte Stamm-Person
   * @throws NotFoundException wenn Stamm-Person nicht existiert
   * @throws ConflictException wenn Person nicht archiviert ist (AC8)
   */
  @Patch(':id/restore')
  @Throttle({ default: ADMIN_MUTATION_RATE_LIMIT })
  @ApiOperation({ summary: 'Archivierte Stamm-Person wiederherstellen' })
  @ApiWrappedResponse(StammPersonDto, { description: 'Stamm-Person erfolgreich wiederhergestellt' })
  @ApiConflictResponse({ description: 'Stamm-Person ist nicht archiviert oder ungültige CUID' })
  @ApiNotFoundResponse({ description: 'Stamm-Person nicht gefunden' })
  async restore(@Param('id', ParseCuidPipe) id: string, @CurrentUser() user: ValidatedUser): Promise<StammPersonDto> {
    // Create Command
    const commandResult = RestoreStammPersonCommand.create({
      id,
      restoredBy: user.userId,
    });

    if (commandResult.isFailure) {
      throw new BadRequestException(commandResult.error);
    }

    // Execute Command
    const command = commandResult.value;
    if (!command) {
      throw new BadRequestException('Fehler beim Erstellen des Commands');
    }

    const result = await this.restoreHandler.execute(command);

    if (result.isFailure) {
      // Check error codes instead of string matching
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.NOT_FOUND)) {
        throw new NotFoundException(StammPersonError.extractMessage(result.error));
      }
      if (result.error && StammPersonError.hasCode(result.error, STAMM_PERSON_ERROR_CODES.NOT_ARCHIVED)) {
        throw new ConflictException(StammPersonError.extractMessage(result.error)); // AC8: 409 Conflict (Zustandskonflikt)
      }
      throw new BadRequestException(result.error);
    }

    // Return restored Stamm-Person DTO
    if (!result.value) {
      throw new InternalServerErrorException('Fehler beim Wiederherstellen der Stamm-Person');
    }

    // Audit logging for mutation
    this.logger.log(`Stamm-Person wiederhergestellt: ${result.value.id} (${result.value.vorname} ${result.value.nachname}) von Admin ${user.userId}`);

    return result.value;
  }
}
