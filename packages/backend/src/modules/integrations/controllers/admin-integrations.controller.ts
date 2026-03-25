/**
 * AdminIntegrationsController - Admin-Endpoint fuer Integrationsübersicht.
 *
 * Bietet eine aggregierte Sicht auf alle externen Integrationen
 * mit Status, Circuit Breaker Info und empfohlener Aktion.
 *
 * **Endpoints:**
 * - GET /admin/integrations/overview - Integrationsübersicht abrufen
 *
 * @module modules/integrations/controllers
 */

import { Controller, Get, Inject, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiTooManyRequestsResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ADMIN_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';

import { GetIntegrationOverviewHandler } from '@application/integrations/queries/get-integration-overview/get-integration-overview.handler';
import { GetIntegrationOverviewQuery } from '@application/integrations/queries/get-integration-overview/get-integration-overview.query';
import { IntegrationOverviewResponseDto } from '../dto';

/**
 * Admin Controller fuer Integrationsübersicht (alle externen Services).
 */
@ApiTags('admin-integrations')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@Controller({ path: 'admin/integrations', version: 'alpha' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminIntegrationsController {
  constructor(
    @Inject(LOGGER)
    private readonly logger: ILogger,
    private readonly getOverviewHandler: GetIntegrationOverviewHandler,
  ) {}

  /**
   * Integrationsübersicht abrufen.
   *
   * Gibt den aggregierten Status aller externen Integrationen zurück.
   * Kombiniert Circuit Breaker Status mit Credential-/Token-Zustand.
   *
   * @param user - Aktueller Admin-Benutzer (fuer Audit)
   * @returns Übersicht aller externen Integrationen
   */
  @Get('overview')
  @ApiOperation({ summary: 'Übersicht aller externen Integrationen mit aggregiertem Status' })
  @ApiWrappedResponse(IntegrationOverviewResponseDto, { description: 'Übersicht aller externen Integrationen' })
  async getOverview(@CurrentUser() user: ValidatedUser): Promise<IntegrationOverviewResponseDto> {
    const query = GetIntegrationOverviewQuery.create();
    const result = await this.getOverviewHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Integrationsübersicht fehlgeschlagen: ${result.error}`, 'AdminIntegrationsController');
      throw new InternalServerErrorException('Fehler beim Laden der Integrationsübersicht');
    }

    // eslint-disable-next-line typescript/no-non-null-assertion -- Nach isFailure-Check ist value garantiert vorhanden
    const overview = result.value!;
    this.logger.log(`Integrationsübersicht abgerufen von ${user.userId}: ${overview.integrations.length} Integrationen`, 'AdminIntegrationsController');

    return {
      integrations: overview.integrations,
    };
  }
}
