import { Controller, Get, UseGuards, Logger, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiUnauthorizedResponse, ApiTooManyRequestsResponse, ApiInternalServerErrorResponse, ApiQuery, ApiBadRequestResponse } from '@nestjs/swagger';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { GetAllStammFahrzeugeHandler } from '@application/kraefte/stamm-fahrzeuge/queries/get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.handler';
import { GetAllStammFahrzeugeQuery } from '@application/kraefte/stamm-fahrzeuge/queries/get-all-stamm-fahrzeuge/get-all-stamm-fahrzeuge.query';
import { StammFahrzeugDto } from '@application/kraefte/stamm-fahrzeuge/dto/stamm-fahrzeug.dto';

/**
 * Öffentlicher Controller für StammFahrzeuge-Abfragen.
 *
 * Dieser Controller ist für alle authentifizierten User zugänglich (nicht nur Admins).
 * Wird benötigt, um beim Erfassen von Fahrzeugen für einen Einsatz die verfügbaren
 * Stamm-Fahrzeuge zur Auswahl anzubieten.
 *
 * **Unterschied zum AdminStammFahrzeugeController:**
 * - Nur lesender Zugriff (keine CRUD-Operationen)
 * - Nur nicht-archivierte Fahrzeuge werden zurückgegeben
 * - JwtAuthGuard statt AdminJwtAuthGuard
 */
@ApiTags('kraefte-stamm-fahrzeuge')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@Controller({ path: 'kraefte/stamm-fahrzeuge', version: 'alpha' })
@UseGuards(JwtAuthGuard)
export class StammFahrzeugeController {
  private readonly logger = new Logger(StammFahrzeugeController.name);

  constructor(private readonly getAllHandler: GetAllStammFahrzeugeHandler) {}

  /**
   * Alle nicht-archivierten StammFahrzeuge auflisten.
   *
   * Gibt nur nicht-archivierte Fahrzeuge zurück (für Einsatz-Erfassung).
   * Wird verwendet für die Fahrzeugauswahl im "Fahrzeug hinzufügen" Dialog.
   *
   * @param includeArchived - Optional: Auch archivierte Fahrzeuge anzeigen (default: false)
   * @returns Array aller nicht-archivierten StammFahrzeuge
   */
  @Get()
  @ApiOperation({ summary: 'Alle StammFahrzeuge auflisten' })
  @ApiWrappedResponse(StammFahrzeugDto, { isArray: true, description: 'Liste aller StammFahrzeuge' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Archivierte Fahrzeuge einschließen' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('includeArchived') includeArchived?: string): Promise<StammFahrzeugDto[]> {
    // Parse boolean manually (default: false)
    let parsedIncludeArchived = false;

    if (includeArchived !== undefined) {
      if (includeArchived === 'true') {
        parsedIncludeArchived = true;
      } else if (includeArchived === 'false') {
        parsedIncludeArchived = false;
      } else {
        this.logger.warn(`Invalid includeArchived value received: '${includeArchived}'`);
        throw new BadRequestException("Ungültiger Wert für 'includeArchived'. Erlaubte Werte: 'true', 'false' oder Parameter weglassen.");
      }
    }

    const query = new GetAllStammFahrzeugeQuery(parsedIncludeArchived);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Abrufen der StammFahrzeuge: ${result.error}`);
      return [];
    }

    return result.value ?? [];
  }
}
