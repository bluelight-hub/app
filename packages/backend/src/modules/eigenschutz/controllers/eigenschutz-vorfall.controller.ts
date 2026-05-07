import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import { format as formatDate } from 'date-fns';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import { EIGENSCHUTZ_VORFALL_PDF_RENDERER, EIGENSCHUTZ_VORFALL_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import type { IEigenschutzVorfallPdfRenderer } from '@/application/eigenschutz/ports/i-eigenschutz-vorfall-pdf-renderer.port';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { RequiresPermission } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { ReportVorfallCommand } from '@/application/eigenschutz/commands/report-vorfall/report-vorfall.command';
import { GetVorfallByIdQuery } from '@/application/eigenschutz/queries/get-vorfall-by-id/get-vorfall-by-id.query';
import { ListVorfaelleQuery } from '@/application/eigenschutz/queries/list-vorfaelle/list-vorfaelle.query';
import type { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import { BeteiligterFreitextDto, BeteiligterUserDto, ReportVorfallDto, WoCoordinateDto, WoFreitextDto } from '@/application/eigenschutz/dto/report-vorfall.dto';
import { EigenschutzVorfallDto } from '@/application/eigenschutz/dto/eigenschutz-vorfall.dto';
import { EigenschutzVorfallListItemDto } from '@/application/eigenschutz/dto/eigenschutz-vorfall-list-item.dto';
import { ListVorfaelleQueryDto } from '@/application/eigenschutz/dto/list-vorfaelle-query.dto';

// CUID2-Pattern (24–32 lowercase alphanumerisch; deckt cuid2 strict + Prisma
// `@default(cuid())` v1 25-Zeichen-IDs ab). Defense-in-Depth-Check für AC8-
// Sentinel `…:einheitIdInvalid:<index>` mit Per-Index-Information.
const CUID2_PATTERN = /^[a-z0-9]{24,32}$/;
import { toEigenschutzVorfallDto } from '@/application/eigenschutz/dto/eigenschutz-vorfall.factory';
import { toEigenschutzVorfallListItemDto } from '@/application/eigenschutz/dto/eigenschutz-vorfall-list-item.factory';
import type { IEigenschutzVorfallRepository, VorfallListFilter, VorfallListReadRow } from '@domain/eigenschutz/repositories';
import type { BeteiligterProps } from '@domain/eigenschutz/value-objects/beteiligter.vo';
import type { WoProps } from '@domain/eigenschutz/value-objects/wo.vo';

/**
 * Controller für Eigenschutz-Vorfall-Endpoints (Stories 5.1–5.4).
 *
 * Endpoints unter `/api/einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle`:
 * - `POST  /` — Vorfall melden (Story 5.1, AC7)
 * - `GET   /` — Vorfall-Liste mit Filtern (Story 5.3, AC8)
 * - `GET   /:vorfallId` — Vorfall-Detail (Story 5.2, AC10)
 * - `GET   /:vorfallId/export?format=pdf` — Vorfall als PDF exportieren (Story 5.4, AC3)
 *
 * Audit-Event `VorfallExportiert` ist Story 5.6 — bewusst nicht in diesem Controller.
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiExtraModels(EigenschutzVorfallDto, EigenschutzVorfallListItemDto, ListVorfaelleQueryDto, ReportVorfallDto, BeteiligterUserDto, BeteiligterFreitextDto, WoCoordinateDto, WoFreitextDto)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ungültig' })
@ApiForbiddenResponse({ description: 'Keine ausreichende Permission für die Aktion' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
export class EigenschutzVorfallController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
    @Inject(EIGENSCHUTZ_VORFALL_PDF_RENDERER)
    private readonly pdfRenderer: IEigenschutzVorfallPdfRenderer,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequiresPermission('eigenschutz:vorfall:report')
  @ApiOperation({ summary: 'Neuen Vorfall melden (Pflichtfelder Was/Wann/Wo/Beteiligte/Maßnahmen)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiBody({ type: ReportVorfallDto })
  @ApiWrappedCreatedResponse(EigenschutzVorfallDto, { description: 'Neu erfasster Vorfall mit leerem Kontext-Snapshot (Story 5.2 erweitert).' })
  @ApiBadRequestResponse({ description: 'DTO-Validation fehlgeschlagen' })
  @ApiUnprocessableEntityResponse({ description: 'Aggregate-Invariante (Wallclock-Drift, Wo-Cap, Beteiligter-Format) verletzt' })
  async reportVorfall(@Param('einsatzId') einsatzId: string, @Body() body: ReportVorfallDto, @CurrentUser() user: ValidatedUser): Promise<EigenschutzVorfallDto> {
    const wann = new Date(body.wann);
    const vorfallZeit = new Date(body.vorfallZeit);
    const wo = body.wo ?? null;
    const command = new ReportVorfallCommand(
      einsatzId,
      body.einheitId,
      body.was,
      wann,
      vorfallZeit,
      wo as WoProps | null,
      body.beteiligte as BeteiligterProps[],
      body.massnahmen,
      body.unfallkasseRelevant,
      user.userId,
    );

    const result = (await this.commandBus.execute(command)) as Result<string>;
    if (result.isFailure || !result.value) {
      throw this.mapCommandError(result.error ?? 'Vorfall konnte nicht gemeldet werden');
    }
    return this.loadDto(einsatzId, result.value);
  }

  /**
   * Story 5.3 AC8 — Vorfall-Liste mit Filtern (FR36). Liefert kompakte
   * Read-Rows ohne `kontextSnapshot` (Cap @ 200, sortiert
   * `vorfallZeit DESC, id DESC`).
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequiresPermission('eigenschutz:vorfall:read')
  @ApiOperation({ summary: 'Vorfälle eines Einsatzes filtern (Liste, max. 200 Einträge)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiQuery({ name: 'einheitIds', type: String, required: false, description: 'CSV-Liste von CUID2 (max 50)' })
  @ApiQuery({ name: 'vorfallZeitVon', type: String, required: false, description: 'ISO 8601 mit Offset (untere Schranke, inklusiv)' })
  @ApiQuery({ name: 'vorfallZeitBis', type: String, required: false, description: 'ISO 8601 mit Offset (obere Schranke, exklusiv)' })
  @ApiQuery({ name: 'unfallkasseRelevant', type: Boolean, required: false })
  @ApiWrappedResponse(EigenschutzVorfallListItemDto, {
    description: 'Gefilterte Vorfall-Liste (max. 200 Einträge, sortiert vorfallZeit DESC, id DESC)',
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Filter-Validation fehlgeschlagen (z. B. ungültige CUID2, > 50 Einträge, Range-Invalid)' })
  async listVorfaelle(@Param('einsatzId') einsatzId: string, @Query() query: ListVorfaelleQueryDto, @CurrentUser() user: ValidatedUser): Promise<EigenschutzVorfallListItemDto[]> {
    const filter = this.buildListFilter(query);
    const result = (await this.queryBus.execute(new ListVorfaelleQuery(einsatzId, filter, user.userId))) as Result<VorfallListReadRow[]>;
    if (result.isFailure) {
      throw this.mapListError(result.error ?? 'Vorfall-Liste konnte nicht geladen werden');
    }
    return (result.value ?? []).map(toEigenschutzVorfallListItemDto);
  }

  /**
   * Story 5.2 AC10 — Vorfall-Detail-Read inkl. `kontextSnapshot`. Cross-
   * Einsatz wird vom Query-Handler als `NotFound:Vorfall` gerendert (kein
   * Existenz-Leak). Reconstitute-Failure (z. B. korrupter Snapshot) → 500.
   */
  @Get(':vorfallId')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission('eigenschutz:vorfall:read')
  @ApiOperation({ summary: 'Vorfall-Detail laden (inkl. zeitpunkt-genauem Kontext-Snapshot)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'vorfallId', type: String, description: 'CUID des Vorfalls' })
  @ApiWrappedResponse(EigenschutzVorfallDto, { description: 'Vorfall-Detail mit Snapshot zum Vorfallzeitpunkt' })
  @ApiNotFoundResponse({ description: 'Vorfall nicht gefunden oder gehört zu einem fremden Einsatz' })
  async getVorfall(@Param('einsatzId') einsatzId: string, @Param('vorfallId') vorfallId: string): Promise<EigenschutzVorfallDto> {
    const result = (await this.queryBus.execute(new GetVorfallByIdQuery(einsatzId, vorfallId))) as Result<EigenschutzVorfall>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Vorfall konnte nicht geladen werden');
    }
    return toEigenschutzVorfallDto(result.value);
  }

  /**
   * Story 5.4 — Vorfall als PDF exportieren (FR34, AR13, NFR-P5).
   *
   * Self-contained: PDF-Renderer arbeitet ausschließlich auf dem
   * Aggregate-`kontextSnapshot` (keine Live-Joins). `format=json` ist für
   * Story 5.5 reserviert und antwortet hier strikt mit HTTP 400.
   */
  @Get(':vorfallId/export')
  @HttpCode(HttpStatus.OK)
  @RequiresPermission('eigenschutz:vorfall:export')
  @ApiOperation({ summary: 'Vorfall als PDF exportieren (Unfallkassen-Format)' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'CUID des Einsatzes' })
  @ApiParam({ name: 'vorfallId', type: String, description: 'CUID des Vorfalls' })
  @ApiQuery({ name: 'format', enum: ['pdf'], required: false, description: 'Export-Format. Default: pdf. JSON folgt mit Story 5.5.' })
  @ApiProduces('application/pdf')
  @ApiNotFoundResponse({ description: 'Vorfall nicht gefunden oder gehört zu einem fremden Einsatz' })
  @ApiBadRequestResponse({ description: 'format-Query-Parameter ungültig (z. B. format=json — folgt mit Story 5.5)' })
  async exportVorfall(
    @Param('einsatzId') einsatzId: string,
    @Param('vorfallId') vorfallId: string,
    @Query('format') format: string | string[] | undefined,
    @CurrentUser() user: ValidatedUser,
    @Res() res: Response,
  ): Promise<void> {
    // Code-Review-Patch (P6): `?format=pdf&format=json` lässt Express den Wert
    // als Array landen. Vor der `===`-Prüfung als „mehrfache Werte" mit
    // präzisem Sentinel ablehnen, damit der Format-Validation-Sentinel nicht
    // als `format=pdf,json:notSupported` fehlinterpretiert wird.
    if (Array.isArray(format)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationFailed:VorfallExport:format=multiple:notSupported',
        context: { rule: 'ValidationFailed', filter: 'format=multiple' },
      });
    }
    const requestedFormat = format ?? 'pdf';
    if (requestedFormat !== 'pdf') {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: `ValidationFailed:VorfallExport:format=${requestedFormat}:notSupported`,
        context: { rule: 'ValidationFailed', filter: `format=${requestedFormat}` },
      });
    }

    // Code-Review-Patch (P5): Path-Param wird ungeprüft in den
    // `Content-Disposition`-Header und Filenamen verwendet. CUID2-Pattern als
    // Defense-in-Depth gegen Header-Injection (CRLF, `"`) und ungültige
    // Dateinamen-Zeichen (`/`, `\`).
    if (!CUID2_PATTERN.test(vorfallId)) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationFailed:VorfallExport:vorfallIdInvalid',
        context: { rule: 'ValidationFailed', filter: 'vorfallIdInvalid' },
      });
    }

    const result = (await this.queryBus.execute(new GetVorfallByIdQuery(einsatzId, vorfallId))) as Result<EigenschutzVorfall>;
    if (result.isFailure || !result.value) {
      throw this.mapQueryError(result.error ?? 'Vorfall konnte nicht geladen werden');
    }

    const buffer = await this.pdfRenderer.generate({
      vorfall: result.value,
      erzeugtAm: new Date(),
      erzeugtVonUserId: user.userId,
    });

    const filename = `vorfall-${vorfallId}-${formatDate(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    // Code-Review-Patch (P7): das PDF enthält PII (redacted IDs, Klarnamen aus
    // Freitext-Beteiligten). `Cache-Control: no-store, private` verhindert,
    // dass Proxies/Browser die Antwort zwischenspeichern.
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(buffer);
  }

  private buildListFilter(query: ListVorfaelleQueryDto): VorfallListFilter {
    const filter: { -readonly [K in keyof VorfallListFilter]: VorfallListFilter[K] } = {};
    if (query.einheitIds !== undefined) {
      // AC8 verlangt Per-Index-Sentinel `…:einheitIdInvalid:<index>`. Der DTO-
      // Validator (`@Matches`, each: true) wirft eine generische Liste — wir
      // führen hier einen Pre-Check, damit der Index sichtbar ins Sentinel
      // rückläuft (Defense-in-Depth gegen DTO-Pipe-Bypass + Spec-genauer
      // Wortlaut für Frontend-Fehlermeldungen).
      for (const [index, id] of query.einheitIds.entries()) {
        if (!CUID2_PATTERN.test(id)) {
          throw new BadRequestException({
            statusCode: 400,
            error: 'Bad Request',
            message: `ValidationFailed:VorfallListFilter:einheitIdInvalid:${index}`,
            context: { rule: 'ValidationFailed', filter: `einheitIdInvalid:${index}`, index },
          });
        }
      }
      filter.einheitIds = query.einheitIds;
    }
    // ISO-Validierung passiert bereits via DTO `@IsISO8601({ strict: true })`.
    // Hier nur die String→Date-Konversion, ohne erneute Validierung.
    if (query.vorfallZeitVon !== undefined) filter.vorfallZeitVon = new Date(query.vorfallZeitVon);
    if (query.vorfallZeitBis !== undefined) filter.vorfallZeitBis = new Date(query.vorfallZeitBis);
    if (query.unfallkasseRelevant !== undefined) filter.unfallkasseRelevant = query.unfallkasseRelevant;
    return filter;
  }

  private mapListError(error: string): BadRequestException | InternalServerErrorException {
    if (error.startsWith('ValidationFailed:VorfallListFilter:')) {
      return new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: error,
        context: { rule: 'ValidationFailed', filter: error.slice('ValidationFailed:VorfallListFilter:'.length) },
      });
    }
    if (error.startsWith('InfrastructureError:')) {
      return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { layer: 'infrastructure' } });
    }
    this.logger.error('Unexpected Vorfall list error', { errorCategory: error.split(':')[0] ?? 'unknown' });
    return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { rule: 'Unexpected' } });
  }

  private mapQueryError(error: string): NotFoundException | InternalServerErrorException {
    if (error === 'NotFound:Vorfall') {
      return new NotFoundException({ statusCode: 404, error: 'Not Found', message: error, context: { resource: 'vorfall' } });
    }
    if (error.startsWith('InfrastructureError:') || error.startsWith('Invariant:')) {
      const layer = error.startsWith('Invariant:') ? 'domain' : 'infrastructure';
      // KontextSnapshotCorrupt-Sub-Sentinel ins rule-Feld surfacen — der
      // Frontend-EmptyState kann darauf reagieren (AC10 + AC12). Die Repo-
      // Wrap-Sentinel-Chain ist `InfrastructureError:ReconstituteEigenschutzVorfall:`
      // + Mapper-Sentinel; der Mapper liefert seinerseits ein
      // `InfrastructureError:KontextSnapshotCorrupt:<reason>`. Die optionale
      // `(?:InfrastructureError:)?`-Gruppe überspringt das nested Prefix,
      // damit `KontextSnapshotCorrupt` (nicht `InfrastructureError`) im
      // `rule`-Feld landet.
      const ruleMatch = error.match(/InfrastructureError:ReconstituteEigenschutzVorfall:(?:InfrastructureError:)?([A-Za-z]+)/);
      const rule = ruleMatch?.[1] ?? 'Unexpected';
      return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { layer, rule } });
    }
    this.logger.error('Unexpected Vorfall query error', { errorCategory: error.split(':')[0] ?? 'unknown' });
    return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { rule: 'Unexpected' } });
  }

  private async loadDto(einsatzId: string, vorfallId: string): Promise<EigenschutzVorfallDto> {
    const result = await this.vorfallRepo.findById(vorfallId);
    // Infrastruktur-Fehler nach erfolgreichem Insert: Vorfall ist persistiert,
    // aber Read-Back schlägt fehl. 404 wäre irreführend (Client retry-t und
    // erzeugt Duplikate). 500 signalisiert die Backend-Inkonsistenz.
    if (result.isFailure) {
      this.logger.error('Read-Back nach erfolgreichem Insert fehlgeschlagen', { vorfallId, error: result.error });
      throw new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'InfrastructureError:LoadVorfallAfterInsert',
        context: { layer: 'infrastructure' },
      });
    }
    if (!result.value) {
      throw new NotFoundException({ statusCode: 404, error: 'Not Found', message: 'NotFound:Vorfall', context: { resource: 'vorfall' } });
    }
    // Cross-Einsatz-Defense: Spec/AC8 verlangt 403 (nicht 404) für Zugriffe
    // auf Vorfälle eines fremden Einsatzes. EinsatzScopeGuard sollte das
    // bereits abfangen — hier als Defense-in-Depth mit korrektem Status.
    if (result.value.einsatzId !== einsatzId) {
      this.logger.warn('Cross-Einsatz-Zugriff auf Vorfall blockiert', { vorfallId, requestedEinsatzId: einsatzId, actualEinsatzId: result.value.einsatzId });
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Forbidden:CrossEinsatz',
        context: { rule: 'CrossEinsatz', resource: 'vorfall' },
      });
    }
    return toEigenschutzVorfallDto(result.value);
  }

  private mapCommandError(error: string): UnprocessableEntityException | InternalServerErrorException {
    if (error.startsWith('ValidationFailed:Wo:')) {
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule: 'ValidationFailed', field: 'wo' },
      });
    }
    const beteiligterMatch = error.match(/^ValidationFailed:Beteiligter:idx=(\d+):/);
    if (beteiligterMatch) {
      const index = Number.parseInt(beteiligterMatch[1] ?? '0', 10);
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule: 'ValidationFailed', field: 'beteiligte', index },
      });
    }
    if (error.startsWith('ValidationFailed:Aggregate:')) {
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule: 'ValidationFailed', layer: 'aggregate' },
      });
    }
    if (error.startsWith('ValidationFailed:')) {
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule: 'ValidationFailed' },
      });
    }
    if (error.startsWith('BusinessRule:')) {
      const rule = error.slice('BusinessRule:'.length);
      return new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: error,
        context: { rule },
      });
    }
    if (error.startsWith('InfrastructureError:') || error.startsWith('Invariant:')) {
      return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { layer: error.startsWith('Invariant:') ? 'domain' : 'infrastructure' } });
    }
    const errorCategory = error.split(':')[0] ?? 'unknown';
    this.logger.error('Unexpected Vorfall command error', { errorCategory });
    return new InternalServerErrorException({ statusCode: 500, error: 'Internal Server Error', message: error, context: { rule: 'Unexpected' } });
  }
}
