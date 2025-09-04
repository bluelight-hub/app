import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/common/decorators/api-wrapped-response.decorator';
import type { PaginatedData } from '@/common/interceptors/transform.interceptor';
import { CacheDuplicateDetectionService } from '@/common/services/cache-duplicate-detection.service';
import { CreateEinsatzDto, EinsatzQueryDto, EinsatzResponseDto, StatusCountsResponseDto, UpdateEinsatzDto } from '@/einsatz/dto';
import { Body, Controller, Get, Logger, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { EinsatzService } from './einsatz.service';

/**
 * Controller für Einsatzverwaltung
 *
 * SICHERHEITSKRITISCH: No-Delete Policy
 * =====================================
 * Einsätze dürfen aus rechtlichen und Compliance-Gründen NIEMALS physisch gelöscht werden!
 *
 * Gründe:
 * - Gesetzliche Aufbewahrungspflichten (mind. 10 Jahre)
 * - Audit-Trail und Nachvollziehbarkeit
 * - Beweissicherung für rechtliche Verfahren
 * - Compliance-Anforderungen für Rettungsorganisationen
 *
 * Archivierung statt Löschung:
 * - Verwende Status 'ARCHIVIERT' für "gelöschte" Einsätze
 * - Soft-Delete Pattern mit Filterung in Abfragen
 * - Keine DELETE-Endpoints implementieren
 *
 * @security Diese Policy ist in arc42 Kapitel 08-concepts dokumentiert
 * @see docs/architecture/08-concepts.adoc#no-delete-policy-für-einsätze
 */
@ApiTags('Einsatz')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Aktion' })
@Controller({
  path: 'einsatz',
  version: 'alpha',
})
export class EinsatzController {
  private readonly logger = new Logger(EinsatzController.name);

  constructor(
    private readonly einsatzService: EinsatzService,
    private readonly duplicateDetectionService: CacheDuplicateDetectionService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Neuen Einsatz erstellen',
    description: 'Erstellt einen neuen Einsatz mit automatisch generiertem Namen. Alle Felder sind optional.',
  })
  @ApiWrappedResponse(EinsatzResponseDto, { description: 'Einsatz erfolgreich erstellt' })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createEinsatzDto: CreateEinsatzDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzResponseDto> {
    this.logger.log(`Creating new Einsatz for user ${user.userId}`);

    // Generiere Cache-Key basierend auf Eingabedaten und User
    const cacheKey = `einsatz:create:${user.userId}:${JSON.stringify(createEinsatzDto)}`;

    return await this.duplicateDetectionService.executeIdempotent(
      cacheKey,
      () => this.einsatzService.create(createEinsatzDto, user.userId),
      60000, // 1 Minute TTL
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Alle Einsätze abrufen',
    description:
      'Gibt eine paginierte Liste aller Einsätze zurück. WICHTIG: Archivierte Einsätze werden gemäß No-Delete Policy standardmäßig ausgeschlossen. Verwende includeArchived=true um archivierte Einsätze einzuschließen.',
  })
  @ApiWrappedResponse(EinsatzResponseDto, { description: 'Paginierte Liste der Einsätze (ohne archivierte, außer explizit angefordert)', isArray: true })
  @ApiBadRequestResponse({ description: 'Ungültige Query-Parameter' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: EinsatzQueryDto,
  ): Promise<PaginatedData<EinsatzResponseDto>> {
    this.logger.log(`Fetching Einsätze with filters: ${JSON.stringify(query)}`);
    return await this.einsatzService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Einzelnen Einsatz abrufen',
    description: 'Gibt einen einzelnen Einsatz mit allen Details zurück.',
  })
  @ApiWrappedResponse(EinsatzResponseDto, { description: 'Einsatz gefunden' })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async findOne(@Param('id') id: string): Promise<EinsatzResponseDto> {
    this.logger.log(`Fetching Einsatz ${id}`);
    return await this.einsatzService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Einsatz aktualisieren',
    description: 'Aktualisiert einen bestehenden Einsatz. Der Name wird automatisch neu generiert.',
  })
  @ApiWrappedResponse(EinsatzResponseDto, { description: 'Einsatz erfolgreich aktualisiert' })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  @ApiBadRequestResponse({ description: 'Validierungsfehler in den Eingabedaten' })
  async update(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateEinsatzDto: UpdateEinsatzDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<EinsatzResponseDto> {
    this.logger.log(`Updating Einsatz ${id} by user ${user.userId}`);

    // Generiere Cache-Key basierend auf ID, Eingabedaten und User
    const cacheKey = `einsatz:update:${id}:${user.userId}:${JSON.stringify(updateEinsatzDto)}`;

    return await this.duplicateDetectionService.executeIdempotent(
      cacheKey,
      () => this.einsatzService.update(id, updateEinsatzDto, user.userId),
      60000, // 1 Minute TTL
    );
  }

  /**
   * Archiviert einen Einsatz (Soft-Delete gemäß No-Delete Policy)
   *
   * @security Verwende diesen Endpoint statt DELETE!
   * Einsätze werden nicht gelöscht, sondern als ARCHIVIERT markiert.
   */
  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Einsatz archivieren (Soft-Delete)',
    description: 'Markiert einen Einsatz als ARCHIVIERT. Einsätze werden gemäß No-Delete Policy niemals physisch gelöscht.',
  })
  @ApiWrappedResponse(EinsatzResponseDto, { description: 'Einsatz erfolgreich archiviert' })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  async archive(@Param('id') id: string, @CurrentUser() user: ValidatedUser): Promise<EinsatzResponseDto> {
    this.logger.warn(`Archiving Einsatz ${id} by user ${user.userId} (No-Delete Policy)`);
    return await this.einsatzService.archive(id, user.userId);
  }

  @Get('stats/status-counts')
  @ApiOperation({
    summary: 'Status-Statistiken abrufen',
    description: 'Gibt die Anzahl der Einsätze pro Status zurück.',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'Archivierte Einsätze in die Zählung einbeziehen',
  })
  @ApiWrappedResponse(StatusCountsResponseDto, { description: 'Status-Statistiken erfolgreich abgerufen' })
  async getStatusCounts(@Query('includeArchived') includeArchived?: boolean): Promise<StatusCountsResponseDto> {
    this.logger.log(`Getting status counts (includeArchived: ${includeArchived})`);
    return await this.einsatzService.getStatusCounts(includeArchived);
  }

  @Get(':id/completeness')
  @ApiOperation({
    summary: 'Vollständigkeits-Check für Einsatz',
    description: 'Berechnet und gibt die Vollständigkeit eines Einsatzes zurück.',
  })
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Cache umgehen und neu berechnen',
  })
  @ApiOkResponse({
    description: 'Vollständigkeits-Information',
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', example: 75 },
        isComplete: { type: 'boolean', example: false },
        missingFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              fieldPath: { type: 'string' },
              priority: { type: 'string', enum: ['critical', 'important', 'optional'] },
              message: { type: 'string' },
              suggestedAction: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Einsatz nicht gefunden',
  })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID oder Query-Parameter' })
  async getCompleteness(@Param('id') id: string, @Query('refresh') refresh?: string) {
    const useRefresh = refresh === 'true';
    this.logger.log(`Getting completeness for Einsatz ${id} (refresh: ${useRefresh})`);

    try {
      const result = await this.einsatzService.getCompleteness(id, useRefresh);
      this.logger.log(`Completeness for Einsatz ${id}: ${result.score}% complete`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get completeness for Einsatz ${id}: ${error.message}`);
      throw error;
    }
  }
}
