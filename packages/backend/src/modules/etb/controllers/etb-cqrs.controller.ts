import { ErinnerungTimelineDto, GetErinnerungTimelineQuery, GetErinnerungTimelineQueryHandler } from '@/application/etb/queries';
import { AddEintragCommand, DeleteEintragCommand, LockEtbCommand, UpdateEintragCommand } from '@/application/etb/commands';
import { AddEintragHandler } from '@/application/etb/commands/add-eintrag/add-eintrag.handler';
import { DeleteEintragHandler } from '@/application/etb/commands/delete-eintrag/delete-eintrag.handler';
import { LockEtbHandler } from '@/application/etb/commands/lock-etb/lock-etb.handler';
import { UpdateEintragHandler } from '@/application/etb/commands/update-eintrag/update-eintrag.handler';
import { AddEintragDto, EintragDto, EtbDto, EtbSnapshotDto, TextbausteinDto, UpdateEintragDto } from '@/application/etb/dto';
import { EtbQueryMapper, type EtbSnapshotDto as EtbSnapshotDtoFromMapper } from '@/application/etb/mappers';
import { GetEtbHistoryQuery, GetEtbHistoryQueryHandler, GetEtbQuery, GetEtbQueryHandler, GetTextbausteineHandler, GetTextbausteineQuery } from '@/application/etb/queries';
import type { EtbKategorie } from '@/generated/prisma/client';
import { EINSATZ_ROLLEN_READ_REPOSITORY, EINSATZ_TEILNEHMER_REPOSITORY, ETB_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzRollenReadRepository } from '@domain/repositories/i-einsatz-rollen-read.repository';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import { IEtbRepository } from '@domain/repositories/i-etb.repository';
import { EtbId } from '@domain/value-objects/etb-id';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, NotFoundException, Param, Post, Put, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

/**
 * CQRS Controller für ETB (Einsatztagebuch) Management.
 *
 * Dieser Controller implementiert das CQRS Pattern für ETB-Operationen:
 * - Commands: State Mutation via CommandBus (Add/Update/Delete Eintrag, Lock ETB)
 * - Queries: State Reading via QueryBus (Get ETB, Get History)
 *
 * **Architektur-Entscheidung:**
 * Controller ist ein dünner HTTP-Adapter ohne Business-Logik. Alle Operationen
 * werden an Command/Query Handler delegiert, die in der Application Layer leben.
 * Result Pattern wird für konsistente Fehlerbehandlung verwendet.
 *
 * **Endpunkte:**
 * - GET /etb/einsatz/:einsatzId - ETB für Einsatz abrufen
 * - GET /etb/:etbId/history - ETB Versionshistorie abrufen
 * - GET /etb/:etbId/erinnerungen/:erinnerungId/timeline - Erinnerungs-Timeline abrufen (Story 5.5)
 * - POST /etb/:etbId/eintrag - Neuen Eintrag hinzufügen
 * - PUT /etb/:etbId/eintrag/:eintragId - Eintrag aktualisieren
 * - DELETE /etb/:etbId/eintrag/:eintragId - Eintrag soft-löschen
 * - POST /etb/:etbId/lock - ETB sperren (nur ADMIN/SUPER_ADMIN)
 *
 * @security Alle Endpunkte erfordern valides JWT Token (JwtAuthGuard)
 * @see EtbApplicationModule - Registriert alle Handler
 */
@ApiTags('ETB')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({
  path: 'etb',
  version: 'alpha',
})
export class EtbCqrsController {
  constructor(
    private readonly addEintragHandler: AddEintragHandler,
    private readonly updateEintragHandler: UpdateEintragHandler,
    private readonly deleteEintragHandler: DeleteEintragHandler,
    private readonly lockEtbHandler: LockEtbHandler,
    private readonly getEtbQueryHandler: GetEtbQueryHandler,
    private readonly getEtbHistoryQueryHandler: GetEtbHistoryQueryHandler,
    private readonly getTextbausteineHandler: GetTextbausteineHandler,
    private readonly getErinnerungTimelineHandler: GetErinnerungTimelineQueryHandler,
    @Inject(ETB_REPOSITORY)
    private readonly etbRepository: IEtbRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly einsatzTeilnehmerRepository: IEinsatzTeilnehmerRepository,
    @Inject(EINSATZ_ROLLEN_READ_REPOSITORY)
    private readonly einsatzRollenReadRepository: IEinsatzRollenReadRepository,
  ) {}

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Prüft ob ein User aktiver Einsatzteilnehmer ist.
   *
   * Ein User ist aktiv wenn er am Einsatz teilnimmt und noch nicht verlassen hat (leftAt: null).
   * Delegiert an IEinsatzTeilnehmerRepository (Hexagonale Architektur).
   *
   * @param userId - ID des Users
   * @param einsatzId - ID des Einsatzes
   * @returns true wenn User aktiver Teilnehmer ist, false sonst
   */
  private async checkUserIsActiveTeilnehmer(userId: string, einsatzId: string): Promise<boolean> {
    const teilnehmer = await this.einsatzTeilnehmerRepository.findByEinsatzAndUser(einsatzId, userId);
    return teilnehmer !== null;
  }

  /**
   * Prüft ob ein User das ETB bearbeiten darf (Story 5.5).
   *
   * Sekundaere Rollen (EMPFAENGER, BEOBACHTER) haben nur Lesezugriff.
   * ADMIN/SUPER_ADMIN umgehen die Pruefung.
   * Wenn keine Rollen konfiguriert sind, wird voller Zugriff gewaehrt (Abwaertskompatibilitaet).
   * Delegiert an IEinsatzRollenReadRepository (Hexagonale Architektur).
   *
   * @param userId - ID des Users
   * @param einsatzId - ID des Einsatzes
   * @param userRole - System-Rolle aus JWT (optional)
   * @throws ForbiddenException wenn User keine Schreibberechtigung hat
   */
  private async checkUserCanEditEtb(userId: string, einsatzId: string, userRole?: string): Promise<void> {
    // Admin/SuperAdmin haben immer vollen Zugriff
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return;
    }

    const rolleResult = await this.einsatzRollenReadRepository.findMeineRolle(einsatzId, userId);

    if (rolleResult.isFailure) {
      this.logger.error(`Rollen-Abfrage fehlgeschlagen: ${rolleResult.error}`, 'EtbCqrsController');
      throw new ForbiddenException('Rollenprüfung fehlgeschlagen');
    }

    const rolle = rolleResult.value?.rolle ?? null;

    if (!rolle) {
      // Pruefen ob Rollensystem fuer diesen Einsatz aktiv ist
      const hasRollenResult = await this.einsatzRollenReadRepository.hasAnyRollen(einsatzId);

      if (hasRollenResult.isFailure) {
        this.logger.error(`Rollen-Count fehlgeschlagen: ${hasRollenResult.error}`, 'EtbCqrsController');
        throw new ForbiddenException('Rollenprüfung fehlgeschlagen');
      }

      // Keine Rollen konfiguriert → voller Zugriff (Abwaertskompatibilitaet)
      if (!hasRollenResult.value) return;

      throw new ForbiddenException('Keine Schreibberechtigung fuer das ETB: Ihnen wurde keine Rolle in diesem Einsatz zugewiesen.');
    }

    if (rolle === 'EMPFAENGER' || rolle === 'BEOBACHTER') {
      throw new ForbiddenException(`Keine Schreibberechtigung fuer das ETB. Ihre Rolle (${rolle}) erlaubt nur Lesezugriff. Nutzen Sie stattdessen die Befehle-Ansicht.`);
    }
  }

  // ============================================
  // GET ENDPOINTS (Queries)
  // ============================================

  /**
   * Alle Textbausteine abrufen.
   *
   * Textbausteine sind vordefinierte Text-Templates fuer die schnelle
   * Erstellung von ETB-Eintraegen. Sie reduzieren Tipparbeit und
   * standardisieren haeufige Eintragstypen.
   *
   * **Route-Position:**
   * MUSS VOR parametrisierten Routen wie :etbId/history kommen,
   * da sonst "textbausteine" als etbId interpretiert wird.
   *
   * @param kategorie - Optional: Filtert nach Kategorie
   * @param onlyActive - Nur aktive Textbausteine (Standard: true)
   * @returns TextbausteinListResponse mit allen Textbausteinen
   */
  @Get('textbausteine')
  @ApiOperation({
    summary: 'Alle Textbausteine abrufen',
    description: 'Gibt alle verfuegbaren Textbausteine zur schnellen ETB-Erstellung zurueck. Optional nach Kategorie filterbar.',
  })
  @ApiWrappedResponse(TextbausteinDto, {
    isArray: true,
    description: 'Textbausteine erfolgreich abgerufen',
  })
  @ApiBadRequestResponse({ description: 'Fehler beim Laden der Textbausteine' })
  @ApiQuery({ name: 'kategorie', required: false, description: 'Filter nach Kategorie (z.B. ALARMIERUNG, LAGE)' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean, description: 'Nur aktive Textbausteine (Standard: true)' })
  async getTextbausteine(@Query('kategorie') kategorie?: string, @Query('onlyActive') onlyActive?: string): Promise<TextbausteinDto[]> {
    this.logger.log(`Getting Textbausteine (kategorie: ${kategorie ?? 'all'}, onlyActive: ${onlyActive ?? 'true'})`);

    // Parse onlyActive - Standard ist true
    const onlyActiveBoolean = onlyActive === undefined || onlyActive === 'true';

    // Parse kategorie - undefined wenn nicht angegeben
    const kategorieEnum = kategorie as EtbKategorie | undefined;

    const query = new GetTextbausteineQuery(kategorieEnum, onlyActiveBoolean);
    const result = await this.getTextbausteineHandler.execute(query);

    if (result.isFailure) {
      throw new BadRequestException(result.error);
    }

    return result.value ?? [];
  }

  /**
   * ETB für Einsatz abrufen (AC4)
   *
   * Lädt das ETB für einen Einsatz via GetEtbQuery. Unterstützt optionales
   * Einblenden von soft-gelöschten Einträgen via includeDeleted Parameter.
   *
   * @param einsatzId - ID des Einsatzes (CUID2 Format)
   * @param includeDeleted - Optional: Gelöschte Einträge anzeigen (default: false)
   * @returns EtbDto mit allen Einträgen oder null wenn nicht gefunden
   * @throws NotFoundException wenn ETB nicht existiert
   * @throws BadRequestException bei ungültiger einsatzId
   */
  /**
   * ETB für Einsatz abrufen (AC4)
   *
   * Lädt das ETB für einen Einsatz via GetEtbQuery. Unterstützt optionales
   * Einblenden von soft-gelöschten Einträgen via includeDeleted Parameter.
   *
   * **Story 5.9 (AC2, AC3):** Berechtigung wird geprüft - nur aktive Einsatzteilnehmer
   * dürfen das ETB lesen (NFR10).
   *
   * @param einsatzId - ID des Einsatzes (CUID2 Format)
   * @param includeDeleted - Optional: Gelöschte Einträge anzeigen (default: false)
   * @param user - Authentifizierter User (aus JWT)
   * @returns EtbDto mit allen Einträgen oder null wenn nicht gefunden
   * @throws NotFoundException wenn ETB nicht existiert
   * @throws BadRequestException bei ungültiger einsatzId
   * @throws ForbiddenException wenn User kein aktiver Einsatzteilnehmer
   */
  @Get('einsatz/:einsatzId')
  @ApiOperation({
    summary: 'ETB für Einsatz abrufen',
    description: 'Gibt das Einsatztagebuch für einen Einsatz zurück. Optional können soft-gelöschte Einträge mit includeDeleted=true angezeigt werden. Nur aktive Einsatzteilnehmer haben Zugriff.',
  })
  @ApiWrappedResponse(EtbDto, {
    description: 'ETB erfolgreich abgerufen',
  })
  @ApiNotFoundResponse({ description: 'ETB für diesen Einsatz nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    type: Boolean,
    description: 'Soft-gelöschte Einträge anzeigen (default: false)',
  })
  async getEtbByEinsatzId(@Param('einsatzId') einsatzId: string, @CurrentUser() user: ValidatedUser, @Query('includeDeleted') includeDeleted?: string): Promise<EtbDto> {
    const includeDeletedBool = includeDeleted === 'true';
    this.logger.log(`Getting ETB for Einsatz ${einsatzId} (includeDeleted: ${includeDeletedBool}) by user ${user.userId}`);

    // Story 5.9 (AC2, AC3): Prüfe ob User aktiver Einsatzteilnehmer ist
    const isActiveTeilnehmer = await this.checkUserIsActiveTeilnehmer(user.userId, einsatzId);
    if (!isActiveTeilnehmer) {
      this.logger.warn(`User ${user.userId} is not an active participant of Einsatz ${einsatzId}`, 'EtbCqrsController');
      throw new ForbiddenException('Keine Berechtigung: User ist kein aktiver Einsatzteilnehmer');
    }

    try {
      const query = new GetEtbQuery(einsatzId, includeDeletedBool);
      const result = await this.getEtbQueryHandler.execute(query);

      if (result.isFailure) {
        this.logger.error(`Failed to get ETB for Einsatz ${einsatzId}: ${result.error}`);
        if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
          throw new NotFoundException(result.error);
        }
        throw new BadRequestException(result.error);
      }

      if (!result.value) {
        this.logger.warn(`ETB for Einsatz ${einsatzId} not found`);
        throw new NotFoundException(`ETB für Einsatz ${einsatzId} nicht gefunden`);
      }

      this.logger.log(`ETB ${result.value.id} returned for Einsatz ${einsatzId}`);
      return result.value;
    } catch (error) {
      // Query constructor throws Error on validation failure
      if (error instanceof Error && !(error instanceof NotFoundException) && !(error instanceof BadRequestException) && !(error instanceof ForbiddenException)) {
        this.logger.error(`Invalid query parameters: ${error.message}`);
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * ETB Versionshistorie abrufen (AC4)
   *
   * Lädt alle Snapshots eines ETB für die Versionshistorie.
   * Snapshots werden VOR jeder mutierenden Operation erstellt (DRK-Compliance).
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @returns Array von EtbSnapshotDto, sortiert nach Version absteigend (neueste zuerst)
   * @throws NotFoundException wenn ETB nicht existiert
   * @throws BadRequestException bei ungültiger etbId
   */
  /**
   * ETB Versionshistorie abrufen (AC4)
   *
   * Lädt alle Snapshots eines ETB für die Versionshistorie.
   * Snapshots werden VOR jeder mutierenden Operation erstellt (DRK-Compliance).
   *
   * **Story 5.9 (AC2, AC3):** Berechtigung wird geprüft - nur aktive Einsatzteilnehmer
   * dürfen die Historie lesen (NFR10).
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @param user - Authentifizierter User (aus JWT)
   * @returns Array von EtbSnapshotDto, sortiert nach Version absteigend (neueste zuerst)
   * @throws NotFoundException wenn ETB nicht existiert
   * @throws BadRequestException bei ungültiger etbId
   * @throws ForbiddenException wenn User kein aktiver Einsatzteilnehmer
   */
  @Get(':etbId/history')
  @ApiOperation({
    summary: 'ETB Versionshistorie abrufen',
    description: 'Gibt alle Versionen/Snapshots eines ETB zurück. Sortiert nach Version absteigend (neueste zuerst). Nur aktive Einsatzteilnehmer haben Zugriff.',
  })
  @ApiWrappedResponse(EtbSnapshotDto, {
    isArray: true,
    description: 'Versionshistorie erfolgreich abgerufen',
  })
  @ApiNotFoundResponse({ description: 'ETB nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige ETB-ID' })
  async getEtbHistory(@Param('etbId') etbId: string, @CurrentUser() user: ValidatedUser): Promise<EtbSnapshotDtoFromMapper[]> {
    this.logger.log(`Getting history for ETB ${etbId} by user ${user.userId}`);

    // Story 5.9 (AC2, AC3): Lade ETB um einsatzId zu erhalten und Berechtigung zu prüfen
    const etbIdResult = EtbId.create(etbId);
    if (etbIdResult.isFailure || !etbIdResult.value) {
      throw new BadRequestException('Ungültige ETB-ID');
    }

    const etbAggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!etbAggregate) {
      throw new NotFoundException(`ETB ${etbId} nicht gefunden`);
    }

    const einsatzId = etbAggregate.einsatzId.value;

    // Prüfe ob User aktiver Einsatzteilnehmer ist
    const isActiveTeilnehmer = await this.checkUserIsActiveTeilnehmer(user.userId, einsatzId);
    if (!isActiveTeilnehmer) {
      this.logger.warn(`User ${user.userId} is not an active participant of Einsatz ${einsatzId}`, 'EtbCqrsController');
      throw new ForbiddenException('Keine Berechtigung: User ist kein aktiver Einsatzteilnehmer');
    }

    try {
      const query = new GetEtbHistoryQuery(etbId);
      const result = await this.getEtbHistoryQueryHandler.execute(query);

      if (result.isFailure) {
        this.logger.error(`Failed to get history for ETB ${etbId}: ${result.error}`);
        if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
          throw new NotFoundException(result.error);
        }
        throw new BadRequestException(result.error);
      }

      this.logger.log(`${result.value?.length ?? 0} snapshots returned for ETB ${etbId}`);
      return result.value ?? [];
    } catch (error) {
      if (error instanceof Error && !(error instanceof NotFoundException) && !(error instanceof BadRequestException) && !(error instanceof ForbiddenException)) {
        this.logger.error(`Invalid query parameters: ${error.message}`);
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Erinnerungs-Timeline abrufen (Story 5.5)
   *
   * Liefert den vollständigen Verlauf einer Erinnerung als Timeline.
   * Die Timeline zeigt alle Status-Übergänge, Zuweisungen, Snoozes etc.
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @param erinnerungId - ID der Erinnerung (CUID2 Format)
   * @param user - Authentifizierter User (aus JWT)
   * @returns ErinnerungTimelineDto mit allen Timeline-Einträgen
   * @throws NotFoundException wenn ETB oder Erinnerung nicht gefunden
   * @throws BadRequestException bei ungültigen IDs
   */
  @Get(':etbId/erinnerungen/:erinnerungId/timeline')
  @ApiOperation({
    summary: 'Erinnerungs-Timeline abrufen',
    description: 'Gibt den vollständigen Verlauf einer Erinnerung als Timeline zurück. Zeigt alle Status-Übergänge, Zuweisungen, Snoozes etc.',
  })
  @ApiWrappedResponse(ErinnerungTimelineDto, {
    description: 'Vollständiger Erinnerungsverlauf als Timeline',
  })
  @ApiNotFoundResponse({ description: 'ETB oder Erinnerung nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Ungültige ETB-ID oder Erinnerungs-ID' })
  async getErinnerungTimeline(@Param('etbId') etbId: string, @Param('erinnerungId') erinnerungId: string, @CurrentUser() user: ValidatedUser): Promise<ErinnerungTimelineDto> {
    this.logger.log(`Getting timeline for Erinnerung ${erinnerungId} in ETB ${etbId} by user ${user.userId}`);

    // Erst ETB laden um einsatzId zu erhalten
    const etbIdResult = EtbId.create(etbId);
    if (etbIdResult.isFailure || !etbIdResult.value) {
      throw new BadRequestException('Ungültige ETB-ID');
    }

    const etbAggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!etbAggregate) {
      throw new NotFoundException(`ETB ${etbId} nicht gefunden`);
    }

    // CRITICAL 3: Validierung dass ETB zur Route-Parameter etbId gehört
    // ETB und Einsatz haben eine 1:1 Beziehung mit gleicher ID
    // Die einsatzId aus dem geladenen ETB wird an den Handler übergeben,
    // der sie als etbId für die Query verwendet - so ist garantiert,
    // dass nur Einträge vom geladenen ETB zurückgegeben werden
    const einsatzId = etbAggregate.einsatzId.value;

    // CRITICAL 1: Prüfe User-Berechtigung für Einsatz-Zugriff
    // User muss aktiver Einsatzteilnehmer sein (leftAt: null = aktiv)
    const isActiveTeilnehmer = await this.checkUserIsActiveTeilnehmer(user.userId, einsatzId);
    if (!isActiveTeilnehmer) {
      this.logger.warn(`User ${user.userId} is not an active participant of Einsatz ${einsatzId}`, 'EtbCqrsController');
      throw new ForbiddenException('Keine Berechtigung: User ist kein aktiver Einsatzteilnehmer');
    }

    // Timeline-Query erstellen und ausführen
    // Query-Konstruktor validiert Inputs und wirft Error bei ungültigen IDs
    let query: GetErinnerungTimelineQuery;
    try {
      query = new GetErinnerungTimelineQuery(erinnerungId, einsatzId);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Ungültige Query-Parameter');
    }

    const result = await this.getErinnerungTimelineHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Failed to get timeline for Erinnerung ${erinnerungId}: ${result.error}`);
      if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    if (!result.value) {
      throw new NotFoundException(`Timeline für Erinnerung ${erinnerungId} nicht gefunden`);
    }

    this.logger.log(`Timeline for Erinnerung ${erinnerungId} returned with ${result.value.events?.length ?? 0} events`);
    return result.value;
  }

  // ============================================
  // POST/PUT/DELETE ENDPOINTS (Commands)
  // ============================================

  /**
   * Neuen Eintrag zum ETB hinzufügen (AC2)
   *
   * Erstellt einen neuen Eintrag im ETB via AddEintragCommand.
   * Ein Snapshot wird VOR der Mutation erstellt (DRK-Compliance).
   * Die sequenceNumber wird automatisch inkrementiert.
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @param dto - AddEintragDto mit text
   * @param user - Authentifizierter User (aus JWT)
   * @returns Neu erstellter EintragDto
   * @throws NotFoundException wenn ETB nicht gefunden
   * @throws BadRequestException bei Validierungsfehlern oder gesperrtem ETB
   */
  @Post(':etbId/eintrag')
  @ApiOperation({
    summary: 'Eintrag zum ETB hinzufügen',
    description: 'Erstellt einen neuen Eintrag im Einsatztagebuch. Ein Snapshot wird vor der Änderung erstellt.',
  })
  @ApiWrappedCreatedResponse(EintragDto, {
    description: 'Eintrag erfolgreich erstellt',
  })
  @ApiNotFoundResponse({ description: 'ETB nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ETB ist gesperrt' })
  async addEintrag(
    @Param('etbId') etbId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: AddEintragDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EintragDto> {
    this.logger.log(`Adding Eintrag to ETB ${etbId} by user ${user.userId}`);

    // Story 5.9: Lade ETB um einsatzId zu erhalten und Berechtigung zu prüfen
    const etbIdResult = EtbId.create(etbId);
    if (etbIdResult.isFailure || !etbIdResult.value) {
      throw new BadRequestException('Ungültige ETB-ID');
    }

    const etbAggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!etbAggregate) {
      throw new NotFoundException(`ETB ${etbId} nicht gefunden`);
    }

    const einsatzId = etbAggregate.einsatzId.value;

    // Prüfe ob User aktiver Einsatzteilnehmer ist
    const isActiveTeilnehmer = await this.checkUserIsActiveTeilnehmer(user.userId, einsatzId);
    if (!isActiveTeilnehmer) {
      this.logger.warn(`User ${user.userId} is not an active participant of Einsatz ${einsatzId}`, 'EtbCqrsController');
      throw new ForbiddenException('Keine Berechtigung: User ist kein aktiver Einsatzteilnehmer');
    }

    // Story 5.5: Sekundaere Rollen (EMPFAENGER/BEOBACHTER) duerfen nicht schreiben
    await this.checkUserCanEditEtb(user.userId, einsatzId, user.role);

    // Convert optional ISO string to Date if present
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : undefined;

    const commandResult = AddEintragCommand.create(etbId, dto.text, user.userId, dto.kategorie, einsatzId, dto.absender, dto.empfaenger, dto.metadata, occurredAt);
    if (commandResult.isFailure || !commandResult.value) {
      this.logger.error(`Invalid AddEintragCommand: ${commandResult.error}`);
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.addEintragHandler.execute(commandResult.value);

    if (result.isFailure) {
      this.logger.error(`Failed to add Eintrag to ETB ${etbId}: ${result.error}`);
      if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    // Handler returns Result<EtbEintrag>, map to DTO
    const eintrag = result.value;
    if (!eintrag) {
      throw new BadRequestException('Eintrag wurde erstellt, aber kein Ergebnis zurückgegeben');
    }

    const eintragDto = EtbQueryMapper.toEintragDto(eintrag);
    this.logger.log(`Eintrag ${eintragDto.id} added to ETB ${etbId}`);
    return eintragDto;
  }

  /**
   * Eintrag aktualisieren (AC2)
   *
   * Aktualisiert den Text eines Eintrags via UpdateEintragCommand.
   * Ein Snapshot wird VOR der Mutation erstellt (DRK-Compliance).
   * Der alte Text wird für die Historie gespeichert.
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @param eintragId - ID des Eintrags (CUID2 Format)
   * @param dto - UpdateEintragDto mit newText
   * @param user - Authentifizierter User (aus JWT)
   * @returns Aktualisierter EintragDto
   * @throws NotFoundException wenn ETB oder Eintrag nicht gefunden
   * @throws BadRequestException bei Validierungsfehlern oder gesperrtem ETB
   */
  @Put(':etbId/eintrag/:eintragId')
  @ApiOperation({
    summary: 'ETB-Eintrag aktualisieren',
    description: 'Aktualisiert den Text eines Eintrags. Ein Snapshot wird vor der Änderung erstellt.',
  })
  @ApiWrappedResponse(EintragDto, {
    description: 'Eintrag erfolgreich aktualisiert',
  })
  @ApiNotFoundResponse({ description: 'ETB oder Eintrag nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ETB ist gesperrt' })
  async updateEintrag(
    @Param('etbId') etbId: string,
    @Param('eintragId') eintragId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: UpdateEintragDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EintragDto> {
    this.logger.log(`Updating Eintrag ${eintragId} in ETB ${etbId} by user ${user.userId}`);

    // Story 5.9: Lade ETB um einsatzId zu erhalten und Berechtigung zu prüfen
    const etbIdResult = EtbId.create(etbId);
    if (etbIdResult.isFailure || !etbIdResult.value) {
      throw new BadRequestException('Ungültige ETB-ID');
    }

    const etbAggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!etbAggregate) {
      throw new NotFoundException(`ETB ${etbId} nicht gefunden`);
    }

    const einsatzId = etbAggregate.einsatzId.value;

    // Prüfe ob User aktiver Einsatzteilnehmer ist
    const isActiveTeilnehmer = await this.checkUserIsActiveTeilnehmer(user.userId, einsatzId);
    if (!isActiveTeilnehmer) {
      this.logger.warn(`User ${user.userId} is not an active participant of Einsatz ${einsatzId}`, 'EtbCqrsController');
      throw new ForbiddenException('Keine Berechtigung: User ist kein aktiver Einsatzteilnehmer');
    }

    // Story 5.5: Sekundaere Rollen (EMPFAENGER/BEOBACHTER) duerfen nicht schreiben
    await this.checkUserCanEditEtb(user.userId, einsatzId, user.role);

    const commandResult = UpdateEintragCommand.create(etbId, eintragId, dto.newText, user.userId);
    if (commandResult.isFailure || !commandResult.value) {
      this.logger.error(`Invalid UpdateEintragCommand: ${commandResult.error}`);
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.updateEintragHandler.execute(commandResult.value);

    if (result.isFailure) {
      this.logger.error(`Failed to update Eintrag ${eintragId}: ${result.error}`);
      if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    // Handler returns Result<void>, need to load updated Eintrag via Repository
    // Nutze bereits validierte etbIdResult.value von oben
    const updatedAggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!updatedAggregate) {
      throw new NotFoundException('ETB nicht gefunden nach Update');
    }

    // Map aggregate to DTO and find the updated Eintrag
    const etbDto = EtbQueryMapper.toEtbDto(updatedAggregate, false);
    const updatedEintrag = etbDto.eintraege.find((e: EintragDto) => e.id === eintragId);
    if (!updatedEintrag) {
      throw new NotFoundException(`Eintrag ${eintragId} nicht gefunden nach Update`);
    }

    this.logger.log(`Eintrag ${eintragId} updated in ETB ${etbId}`);
    return updatedEintrag;
  }

  /**
   * Eintrag soft-löschen (AC2)
   *
   * Markiert einen Eintrag als gelöscht via DeleteEintragCommand.
   * Ein Snapshot wird VOR der Mutation erstellt (DRK-Compliance).
   * Der Eintrag wird NICHT physisch gelöscht (Soft-Delete).
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @param eintragId - ID des Eintrags (CUID2 Format)
   * @param user - Authentifizierter User (aus JWT)
   * @throws NotFoundException wenn ETB oder Eintrag nicht gefunden
   * @throws BadRequestException bei Validierungsfehlern oder gesperrtem ETB
   */
  @Delete(':etbId/eintrag/:eintragId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'ETB-Eintrag soft-löschen',
    description: 'Markiert einen Eintrag als gelöscht (Soft-Delete). Ein Snapshot wird vor der Änderung erstellt.',
  })
  @ApiNoContentResponse({ description: 'Eintrag erfolgreich gelöscht' })
  @ApiNotFoundResponse({ description: 'ETB oder Eintrag nicht gefunden' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler oder ETB ist gesperrt' })
  async deleteEintrag(@Param('etbId') etbId: string, @Param('eintragId') eintragId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    this.logger.log(`Deleting Eintrag ${eintragId} from ETB ${etbId} by user ${user.userId}`);

    // Story 5.9: Lade ETB um einsatzId zu erhalten und Berechtigung zu prüfen
    const etbIdResult = EtbId.create(etbId);
    if (etbIdResult.isFailure || !etbIdResult.value) {
      throw new BadRequestException('Ungültige ETB-ID');
    }

    const etbAggregate = await this.etbRepository.findById(etbIdResult.value);
    if (!etbAggregate) {
      throw new NotFoundException(`ETB ${etbId} nicht gefunden`);
    }

    const einsatzId = etbAggregate.einsatzId.value;

    // Prüfe ob User aktiver Einsatzteilnehmer ist
    const isActiveTeilnehmer = await this.checkUserIsActiveTeilnehmer(user.userId, einsatzId);
    if (!isActiveTeilnehmer) {
      this.logger.warn(`User ${user.userId} is not an active participant of Einsatz ${einsatzId}`, 'EtbCqrsController');
      throw new ForbiddenException('Keine Berechtigung: User ist kein aktiver Einsatzteilnehmer');
    }

    // Story 5.5: Sekundaere Rollen (EMPFAENGER/BEOBACHTER) duerfen nicht schreiben
    await this.checkUserCanEditEtb(user.userId, einsatzId, user.role);

    const commandResult = DeleteEintragCommand.create(etbId, eintragId, user.userId);
    if (commandResult.isFailure || !commandResult.value) {
      this.logger.error(`Invalid DeleteEintragCommand: ${commandResult.error}`);
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.deleteEintragHandler.execute(commandResult.value);

    if (result.isFailure) {
      this.logger.error(`Failed to delete Eintrag ${eintragId}: ${result.error}`);
      if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
        throw new NotFoundException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    this.logger.log(`Eintrag ${eintragId} deleted from ETB ${etbId}`);
    // No return - HTTP 204 No Content
  }

  // ============================================
  // LOCK ENDPOINT (Admin Only)
  // ============================================

  /**
   * ETB sperren (AC3)
   *
   * Sperrt ein ETB irreversibel via LockEtbCommand.
   * Nur ADMIN oder SUPER_ADMIN dürfen diese Operation ausführen.
   * Nach der Sperrung können keine Einträge mehr hinzugefügt/geändert/gelöscht werden.
   *
   * @param etbId - ID des ETB (CUID2 Format)
   * @param user - Authentifizierter User (aus JWT) mit ADMIN/SUPER_ADMIN Rolle
   * @throws NotFoundException wenn ETB nicht gefunden
   * @throws BadRequestException bei Validierungsfehlern oder bereits gesperrtem ETB
   * @throws ForbiddenException wenn User keine ADMIN/SUPER_ADMIN Rolle hat
   */
  @Post(':etbId/lock')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'ETB sperren (nur Admin)',
    description: 'Sperrt das ETB irreversibel. Nur ADMIN oder SUPER_ADMIN können diese Aktion ausführen.',
  })
  @ApiNoContentResponse({ description: 'ETB erfolgreich gesperrt' })
  @ApiNotFoundResponse({ description: 'ETB nicht gefunden' })
  @ApiBadRequestResponse({ description: 'ETB ist bereits gesperrt oder Validierungsfehler' })
  @ApiForbiddenResponse({ description: 'Nur ADMIN oder SUPER_ADMIN berechtigt' })
  async lockEtb(@Param('etbId') etbId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    this.logger.log(`Locking ETB ${etbId} by user ${user.userId} (role: ${user.role})`);

    const userRole = user.role ?? 'USER';
    const commandResult = LockEtbCommand.create(etbId, user.userId, userRole);
    if (commandResult.isFailure || !commandResult.value) {
      this.logger.error(`Invalid LockEtbCommand: ${commandResult.error}`);
      throw new BadRequestException(commandResult.error);
    }

    const result = await this.lockEtbHandler.execute(commandResult.value);

    if (result.isFailure) {
      this.logger.error(`Failed to lock ETB ${etbId}: ${result.error}`);
      if (result.error?.includes('nicht gefunden') || result.error?.includes('not found')) {
        throw new NotFoundException(result.error);
      }
      if (result.error?.includes('Administratoren')) {
        throw new ForbiddenException(result.error);
      }
      throw new BadRequestException(result.error);
    }

    this.logger.log(`ETB ${etbId} locked by user ${user.userId}`);
    // No return - HTTP 204 No Content
  }
}
