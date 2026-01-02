import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiUnauthorizedResponse, ApiTooManyRequestsResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';

import { GetAllRollenDefinitionenQueryHandler } from '@application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.handler';
import { GetAllRollenDefinitionenQuery } from '@application/kraefte/rollen/queries/get-all-rollen-definitionen/get-all-rollen-definitionen.query';
import { RollenDefinitionDto } from '@application/kraefte/rollen/dto/rollen-definition.dto';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

/**
 * Oeffentlicher Controller fuer RollenDefinitionen-Abfragen.
 *
 * Dieser Controller ist fuer alle authentifizierten User zugaenglich (nicht nur Admins).
 * Wird benoetigt fuer den RollenDefinitionenPicker im BesetzeRolleDialog.
 *
 * **Unterschied zum AdminRollenController:**
 * - Nur lesender Zugriff (keine CRUD-Operationen)
 * - Nur aktive RollenDefinitionen werden zurueckgegeben
 * - JwtAuthGuard statt AdminJwtAuthGuard
 */
@ApiTags('kraefte-rollen-definitionen')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@Controller({ path: 'kraefte/rollen-definitionen', version: 'alpha' })
@UseGuards(JwtAuthGuard)
export class RollenDefinitionenController {
  constructor(
    private readonly getAllHandler: GetAllRollenDefinitionenQueryHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Alle aktiven RollenDefinitionen auflisten.
   *
   * Gibt nur aktive RollenDefinitionen zurueck, sortiert nach sortOrder und Name.
   * Wird verwendet fuer Dropdown-Auswahl beim Besetzen von Rollen.
   *
   * @returns Array aller aktiven RollenDefinitionen
   */
  @Get()
  @ApiOperation({ summary: 'Alle aktiven RollenDefinitionen auflisten' })
  @ApiWrappedResponse(RollenDefinitionDto, { isArray: true, description: 'Liste aller aktiven RollenDefinitionen' })
  async findAllActive(): Promise<RollenDefinitionDto[]> {
    // Nur aktive RollenDefinitionen abrufen (istAktiv = true)
    const query = new GetAllRollenDefinitionenQuery({ istAktiv: true });
    const result = await this.getAllHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Abrufen der aktiven RollenDefinitionen: ${result.error}`);
      // Leeres Array zurueckgeben bei Fehler (graceful degradation)
      return [];
    }

    return result.value ?? [];
  }
}
