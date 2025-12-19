import { Controller, Get, UseGuards, Logger, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiUnauthorizedResponse, ApiTooManyRequestsResponse, ApiInternalServerErrorResponse, ApiQuery, ApiBadRequestResponse } from '@nestjs/swagger';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { GetAllStammPersonenHandler } from '@application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.handler';
import { GetAllStammPersonenQuery } from '@application/kraefte/stamm-personen/queries/get-all-stamm-personen/get-all-stamm-personen.query';
import { StammPersonDto } from '@application/kraefte/stamm-personen/dto/stamm-person.dto';

/**
 * Öffentlicher Controller für StammPersonen-Abfragen.
 *
 * Dieser Controller ist für alle authentifizierten User zugänglich (nicht nur Admins).
 * Wird benötigt, um beim Erfassen von Personen für einen Einsatz die verfügbaren
 * Stamm-Personen zur Auswahl anzubieten (Autocomplete im "Person hinzufügen" Dialog).
 *
 * **Unterschied zum AdminStammPersonenController:**
 * - Nur lesender Zugriff (keine CRUD-Operationen)
 * - Nur nicht-archivierte Personen werden zurückgegeben (default)
 * - JwtAuthGuard statt AdminJwtAuthGuard
 *
 * **Security:**
 * - Least-Privilege-Prinzip: Normale User brauchen keinen Admin-Zugriff
 * - Analog zu StammFahrzeugeController (Story 3.2)
 */
@ApiTags('kraefte-stamm-personen')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@Controller({ path: 'kraefte/stamm-personen', version: 'alpha' })
@UseGuards(JwtAuthGuard)
export class StammPersonenController {
  private readonly logger = new Logger(StammPersonenController.name);

  constructor(private readonly getAllHandler: GetAllStammPersonenHandler) {}

  /**
   * Alle nicht-archivierten StammPersonen auflisten.
   *
   * Gibt nur nicht-archivierte Personen zurück (für Einsatz-Erfassung).
   * Wird verwendet für die Personenauswahl im "Person hinzufügen" Dialog.
   *
   * @param includeArchived - Optional: Auch archivierte Personen anzeigen (default: false)
   * @returns Array aller nicht-archivierten StammPersonen
   */
  @Get()
  @ApiOperation({ summary: 'Alle StammPersonen auflisten' })
  @ApiWrappedResponse(StammPersonDto, { isArray: true, description: 'Liste aller StammPersonen' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean, description: 'Archivierte Personen einschließen' })
  @ApiBadRequestResponse({ description: 'Ungültiger Query-Parameter' })
  async findAll(@Query('includeArchived') includeArchived?: string): Promise<StammPersonDto[]> {
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

    const query = new GetAllStammPersonenQuery(parsedIncludeArchived);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Abrufen der StammPersonen: ${result.error}`);
      return [];
    }

    return result.value ?? [];
  }
}
