import { InternalServerErrorException, Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { GetEigenschutzAmpelStatusQuery } from '@/application/eigenschutz/queries/get-eigenschutz-ampel-status/get-eigenschutz-ampel-status.query';
import { AmpelProjectionDto } from '@/application/eigenschutz/dto/ampel-projection.dto';
import { Result } from '@domain/common/result';
import type { AmpelProjectionReadRow } from '@domain/eigenschutz/repositories';
import { RequiresPermission } from '@/modules/auth/decorators/requires-permission.decorator';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ist ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für den Eigenschutz-Ampelstatus dieses Einsatzes' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, PermissionsGuard)
export class EigenschutzAmpelController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('ampel')
  @RequiresPermission('eigenschutz:gefaehrdungsbeurteilung:read')
  @ApiOperation({ summary: 'Eigenschutz-Ampelstatus für alle Einheiten des Einsatzes laden' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(AmpelProjectionDto, {
    isArray: true,
    description: 'Materialisierte Ampel-Projektionen pro Einsatz-Einheit',
  })
  async getAmpel(@Param('einsatzId') einsatzId: string): Promise<AmpelProjectionDto[]> {
    const result = (await this.queryBus.execute(new GetEigenschutzAmpelStatusQuery(einsatzId))) as Result<AmpelProjectionReadRow[]>;
    if (result.isFailure) {
      throw new InternalServerErrorException({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Ampelstatus konnte nicht geladen werden',
        context: { error: result.error },
      });
    }
    return result.value ?? [];
  }
}
