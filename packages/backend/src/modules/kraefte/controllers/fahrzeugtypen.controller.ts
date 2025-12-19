import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiUnauthorizedResponse, ApiTooManyRequestsResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { GetAllFahrzeugtypenHandler } from '@application/kraefte/fahrzeugtypen/queries/get-all-fahrzeugtypen/get-all-fahrzeugtypen.handler';
import { GetAllFahrzeugtypenQuery } from '@application/kraefte/fahrzeugtypen/queries/get-all-fahrzeugtypen/get-all-fahrzeugtypen.query';
import { FahrzeugtypDto } from '@application/kraefte/fahrzeugtypen/dto/fahrzeugtyp.dto';

/**
 * Öffentlicher Controller für Fahrzeugtypen-Abfragen.
 *
 * Dieser Controller ist für alle authentifizierten User zugänglich (nicht nur Admins).
 * Wird benötigt, um beim Anlegen temporärer Fahrzeuge die verfügbaren Fahrzeugtypen
 * zur Auswahl anzubieten.
 *
 * **Unterschied zum AdminFahrzeugtypenController:**
 * - Nur lesender Zugriff (keine CRUD-Operationen)
 * - Nur aktive Fahrzeugtypen werden zurückgegeben
 * - JwtAuthGuard statt AdminJwtAuthGuard
 */
@ApiTags('kraefte-fahrzeugtypen')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@Controller({ path: 'kraefte/fahrzeugtypen', version: 'alpha' })
@UseGuards(JwtAuthGuard)
export class FahrzeugtypenController {
  private readonly logger = new Logger(FahrzeugtypenController.name);

  constructor(private readonly getAllHandler: GetAllFahrzeugtypenHandler) {}

  /**
   * Alle aktiven Fahrzeugtypen auflisten.
   *
   * Gibt nur aktive Fahrzeugtypen zurück, sortiert nach sortOrder.
   * Wird verwendet für Dropdown-Auswahl beim Anlegen temporärer Fahrzeuge.
   *
   * @returns Array aller aktiven Fahrzeugtypen
   */
  @Get()
  @ApiOperation({ summary: 'Alle aktiven Fahrzeugtypen auflisten' })
  @ApiWrappedResponse(FahrzeugtypDto, { isArray: true, description: 'Liste aller aktiven Fahrzeugtypen' })
  async findAllActive(): Promise<FahrzeugtypDto[]> {
    // Nur aktive Fahrzeugtypen abrufen (istAktiv = true)
    const query = new GetAllFahrzeugtypenQuery(true);
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Abrufen der aktiven Fahrzeugtypen: ${result.error}`);
      // Leeres Array zurückgeben bei Fehler (graceful degradation)
      return [];
    }

    return result.value ?? [];
  }
}
